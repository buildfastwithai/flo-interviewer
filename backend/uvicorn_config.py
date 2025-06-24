import uvicorn
from main import app

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        limit_max_requests=1000,
        limit_concurrency=100,
        # Increase these limits for large file uploads
        h11_max_incomplete_event_size=16 * 1024 * 1024,  # 16MB
        http_max_request_size=100 * 1024 * 1024,  # 100MB
        timeout_keep_alive=30,
        timeout_graceful_shutdown=30
    ) 