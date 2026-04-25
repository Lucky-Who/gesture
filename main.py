from starlette.applications import Starlette
from starlette.staticfiles import StaticFiles
from starlette.responses import FileResponse
from starlette.requests import Request
import uvicorn


app = Starlette()

app.mount('/src', StaticFiles(directory='hand_model/src'), name='src')

async def homepage(request: Request):
    return FileResponse('hand_model/asl_system.html')

app.add_route('/', homepage)


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
