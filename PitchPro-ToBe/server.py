
"""Demo AI MIS3047: run `py server.py` from project root."""
import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def reply(self, code, obj):
        data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/api/ai/status":
            return self.reply(200, {
                "ready": bool(os.getenv("OPENAI_API_KEY")),
                "model": MODEL
            })
        if path == "/":
            self.path = "/index.html"
        elif path != "/index.html" and not path.startswith("/assets/"):
            return self.reply(404, {"error": "Không tìm thấy trang."})
        return super().do_GET()

    def do_POST(self):
        if urlsplit(self.path).path != "/api/ai/analyze":
            return self.reply(404, {"error": "API không tồn tại."})

        if self.headers.get("Content-Type", "").split(";")[0] != "application/json":
            return self.reply(415, {"error": "Yêu cầu gửi JSON."})

        size = self.headers.get("Content-Length", "")
        if not size.isdigit() or not 0 < int(size) <= 12000:
            return self.reply(413, {"error": "Kích thước dữ liệu không hợp lệ."})

        try:
            data = json.loads(self.rfile.read(int(size)))
            if data.get("kind") != "recon":
                raise ValueError("Chỉ hỗ trợ đối soát doanh thu.")

            for method in ("cash", "bank"):
                ledger, counted, diff = (
                    data[key][method]
                    for key in ("ledger", "counted", "difference")
                )
                if (
                    any(
                        type(n) is not int or abs(n) > 100_000_000_000
                        for n in (ledger, counted, diff)
                    )
                    or counted - ledger != diff
                ):
                    raise ValueError("Số tiền hoặc chênh lệch không hợp lệ.")

            # Chỉ gửi số liệu tổng hợp, không gửi thông tin khách hàng
            safe = {
                key: data[key]
                for key in ("kind", "day", "ledger", "counted", "difference")
            }

        except (ValueError, TypeError, KeyError, AttributeError) as err:
            return self.reply(400, {"error": str(err)})

        key = os.getenv("OPENAI_API_KEY", "").strip()
        if not key:
            return self.reply(503, {
                "error": "Chưa cấu hình OPENAI_API_KEY trong Terminal chạy server."
            })

        instruction = (
            "Bạn hỗ trợ nhân viên đối soát doanh thu sân bóng. "
            "Dựa DUY NHẤT trên số liệu đưa vào, nêu giả thuyết, "
            "không kết luận đã nhận tiền hay có gian lận. "
            "Không tự sửa tiền, duyệt hay khóa sổ. "
            "Trả về JSON object có các trường "
            "summary (string), possible_causes (array string), "
            "evidence_to_check (array string), next_steps (array string), "
            "confidence (number từ 0 đến 1, chỉ là mức tự đánh giá "
            "độ đầy đủ thông tin). Viết bằng tiếng Việt, "
            "thừa nhận thiếu bằng chứng khi cần."
        )

        body = {
            "model": MODEL,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": instruction},
                {
                    "role": "user",
                    "content": json.dumps(safe, ensure_ascii=False)
                }
            ]
        }

        req = Request(
            "https://api.openai.com/v1/chat/completions",
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json"
            },
            method="POST"
        )

        try:
            with urlopen(req, timeout=40) as response:
                result = json.load(response)

            answer = json.loads(
                result["choices"][0]["message"]["content"]
            )

            for name in (
                "possible_causes", "evidence_to_check", "next_steps"
            ):
                if not isinstance(answer.get(name), list):
                    raise ValueError("AI thiếu dữ liệu phản hồi.")
                answer[name] = [
                    str(item)[:250] for item in answer[name][:5]
                ]

            if not isinstance(answer.get("summary"), str):
                raise ValueError("AI thiếu phần tóm tắt.")

            conf = answer.get("confidence")
            if (
                isinstance(conf, bool)
                or not isinstance(conf, (float, int))
                or not 0 <= conf <= 1
            ):
                raise ValueError("AI trả mức tin cậy không hợp lệ.")

            advice = {
                "summary": answer["summary"][:400],
                "confidence": float(conf),
                "review_level": (
                    "Cần kiểm chứng thêm" if conf < .8
                    else "Vẫn cần người kiểm chứng"
                ),
                "requires_human_approval": True,
                "model": MODEL,
                **{
                    k: answer[k]
                    for k in (
                        "possible_causes",
                        "evidence_to_check",
                        "next_steps"
                    )
                }
            }
            return self.reply(200, {"advice": advice})

        except HTTPError as err:
            return self.reply(502, {
                "error": (
                    f"OpenAI API lỗi HTTP {err.code}; "
                    "kiểm tra key, quyền model và hạn mức."
                )
            })
        except (URLError, TimeoutError):
            return self.reply(502, {
                "error": "Không kết nối được API AI."
            })
        except (KeyError, ValueError, TypeError, json.JSONDecodeError):
            return self.reply(502, {
                "error": "AI phản hồi chưa đúng định dạng; thử lại."
            })

if __name__ == "__main__":
    port = int(os.getenv("PITCHPRO_PORT", "5500"))
    print(f"Mở http://127.0.0.1:{port}/")
    ThreadingHTTPServer(
        ("127.0.0.1", port), Handler
    ).serve_forever()
