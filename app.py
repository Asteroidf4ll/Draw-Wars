from flask import Flask, render_template
from flask_socketio import SocketIO, emit, join_room
import random

app = Flask(__name__)

app.config["SECRET_KEY"] = "tea-paint"

socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading"
)

# 房间历史记录
rooms_data = {}

@app.route("/")
def index():
    return render_template("index.html")


# =========================
# 加入房间
# =========================

@socketio.on("join_room")
def handle_join(data):

    room = data.get("room")

    if not room:
        return

    join_room(room)

    print(f"用户加入房间: {room}")

    # 不存在则创建
    if room not in rooms_data:
        rooms_data[room] = []

    # 发历史记录给新用户
    emit(
        "init_canvas",
        rooms_data[room]
    )


# =========================
# 绘画同步
# =========================

@socketio.on("draw")
def handle_draw(data):

    room = data.get("room")

    if not room:
        return

    if room not in rooms_data:
        rooms_data[room] = []

    # 保存操作
    rooms_data[room].append(data)

    # 广播给其他人
    emit(
        "draw",
        data,
        to=room,
        include_self=False
    )


# =========================
# 清空画布
# =========================

@socketio.on("clear_canvas")
def handle_clear(data):

    room = data.get("room")

    if not room:
        return

    rooms_data[room] = []

    emit(
        "clear_canvas",
        to=room
    )


if __name__ == "__main__":

    socketio.run(
        app,
        host="0.0.0.0",
        port=5000,
        debug=True,
        allow_unsafe_werkzeug=True
    )