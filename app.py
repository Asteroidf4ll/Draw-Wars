from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room
import random
import time
from uuid import uuid4
import json
import os

SNAPSHOT_DIR = "snapshots"  # 存储快照的文件夹

if not os.path.exists(SNAPSHOT_DIR):
    os.makedirs(SNAPSHOT_DIR)

def save_room_snapshot(room):
    """将房间当前图层数据保存到磁盘"""
    state = get_room_state(room)
    # 构建快照数据
    layers_snapshot = []
    for layer in state.get("layers", []):  # 需要在前端提交图层变更时同步到 state
        layers_snapshot.append({
            "id": layer["id"],
            "name": layer["name"],
            "visible": layer["visible"],
            "locked": layer["locked"],
            "blend": layer["blend"],
            "opacity": layer["opacity"],
            "imageData": layer["imageData"]  # 前端需要将图层图片转为 base64 发送
        })
    snapshot = {
        "canvasWidth": state.get("canvasWidth", 800),
        "canvasHeight": state.get("canvasHeight", 600),
        "activeLayerId": state.get("activeLayerId"),
        "layers": layers_snapshot
    }
    with open(os.path.join(SNAPSHOT_DIR, f"{room}.json"), "w") as f:
        json.dump(snapshot, f)

def load_room_snapshot(room):
    """从磁盘加载房间快照"""
    snapshot_path = os.path.join(SNAPSHOT_DIR, f"{room}.json")
    if os.path.exists(snapshot_path):
        with open(snapshot_path, "r") as f:
            return json.load(f)
    return None

app = Flask(__name__)
app.config["SECRET_KEY"] = "tea-paint"

socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading",
)

room_states = {}
socket_users = {}
EVENT_INTERVAL_DEFAULT = 120
EVENT_DURATION_DEFAULT = 120
HISTORY_ACTION_LIMIT = 10
HISTORY_ACTION_RECOVER_SECONDS = 1
TOOL_GRAB_INITIAL_DROPS = 10
TOOL_GRAB_DROP_INTERVAL = 4
TOOL_GRAB_DROP_TTL = 70
TOOL_GRAB_PERMISSION_DURATION = 30
EVENT_INTERVAL_MIN = 5
EVENT_INTERVAL_MAX = 7200
EVENT_DURATION_MIN = 5
EVENT_DURATION_MAX = 7200
EVENT_POOL = [
    {"key": "grayscale", "type": "grayscale", "label": "黑白模式"},
    {
        "key": "mirror_horizontal",
        "type": "mirror",
        "axis": "horizontal",
        "label": "水平翻转",
    },
    {
        "key": "mirror_vertical",
        "type": "mirror",
        "axis": "vertical",
        "label": "垂直翻转",
    },
    {"key": "reverse_mouse", "type": "reverse_mouse", "label": "鼠标反转"},
    {"key": "random_color", "type": "random_color", "label": "随机颜色"},
    {"key": "shared_history", "type": "shared_history", "label": "共享撤回/重做"},
    {"key": "shared_toolbar", "type": "shared_toolbar", "label": "共享工具栏"},
    {"key": "tool_grab", "type": "tool_grab", "label": "工具抢夺"},
]
EVENT_POOL_BY_KEY = {event["key"]: event for event in EVENT_POOL}
TOOL_DROP_POOL = [
    {"key": "brush:pencil", "category": "brush", "value": "pencil", "label": "铅笔", "weight": 1},
    {"key": "brush:soft", "category": "brush", "value": "soft", "label": "柔边笔", "weight": 2},
    {"key": "brush:marker", "category": "brush", "value": "marker", "label": "马克笔", "weight": 2},
    {"key": "brush:ink", "category": "brush", "value": "ink", "label": "墨线", "weight": 2},
    {"key": "brush:airbrush", "category": "brush", "value": "airbrush", "label": "喷枪", "weight": 2},
    {"key": "eraser:soft-eraser", "category": "eraser", "value": "soft-eraser", "label": "柔边橡皮", "weight": 2},
    {"key": "eraser:hard-eraser", "category": "eraser", "value": "hard-eraser", "label": "硬边橡皮", "weight": 2},
    {"key": "eraser:big-eraser", "category": "eraser", "value": "big-eraser", "label": "大面积橡皮", "weight": 2},
    {"key": "layer:create", "category": "layer", "value": "create", "label": "图层创建", "weight": 2},
    {"key": "layer:blend", "category": "layer", "value": "blend", "label": "混合模式", "weight": 2},
    {"key": "history:undo", "category": "history", "value": "undo", "label": "撤回", "weight": 2},
    {"key": "history:redo", "category": "history", "value": "redo", "label": "重做", "weight": 2},
    {"key": "bomb", "category": "bomb", "value": "bomb", "label": "炸弹", "weight": 2},
]
TOOL_DROP_BY_KEY = {item["key"]: item for item in TOOL_DROP_POOL}
PRESET_CHALLENGES = [
    {"id": "preset_1", "text": "默写任意站姿", "image_data": None},
    {"id": "preset_2", "text": "任意45°仰视头部", "image_data": None},
    {"id": "preset_3", "text": "画一个任意动物", "image_data": None},
    # 可以添加带图片的预设，image_data 放 base64 或 URL
]
def scan_preset_challenges():
    """
    扫描 static/image 下的文件夹，返回分类 -> 题目列表的字典。
    每个题目格式：{"text": 文件名(不含扩展), "image_data": "/static/image/分类名/文件名"}
    """
    base_path = os.path.join(app.static_folder, "image")
    categories = {}
    if not os.path.exists(base_path):
        return categories
    for folder in os.listdir(base_path):
        folder_path = os.path.join(base_path, folder)
        if not os.path.isdir(folder_path):
            continue
        challenges = []
        for filename in os.listdir(folder_path):
            if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
                name, _ = os.path.splitext(filename)
                # 相对路径供前端使用
                img_url = f"/static/image/{folder}/{filename}"
                challenges.append({
                    "text": name,
                    "image_data": img_url
                })
        if challenges:
            categories[folder] = challenges
    return categories
@app.route("/api/preset_categories")
def api_preset_categories():
    categories = scan_preset_challenges()
    return {"categories": list(categories.keys())}
def get_room_state(room):
    if room not in room_states:
        snapshot = load_room_snapshot(room)
        # 默认基础状态
        default_state = {
            "done": [],
            "undone": [],
            "history_limits": {},
            "shared_toolbar_state": None,
            "tool_grab": {
                "drops": [],
                "permissions": {},
                "next_drop_at": 0,
            },
            "active_event": None,
            "active_events": [],
            "event_version": 0,
            "event_loop_started": False,
            "next_event_at": time.time() + EVENT_INTERVAL_DEFAULT,
            "event_settings": {
                "interval": EVENT_INTERVAL_DEFAULT,
                "duration": EVENT_DURATION_DEFAULT,
                "disabled": [],
                "nextKey": None,
            },
            "chat_history": [],
            "message_rate_limit": {},
            "challenge": {
                "active": False,
                "topic": "",
                "image_data": None,
                "started_at": 0,
                "duration": 0,
                "ends_at": 0,
                "initiator_sid": None,
            },
            "custom_challenges": [],
            # 新增持久化字段
            "canvasWidth": 800,
            "canvasHeight": 600,
            "activeLayerId": None,
            "layers": [],   # 存储图层快照
        }
        if snapshot:
            # 从快照恢复
            default_state.update({
                "canvasWidth": snapshot.get("canvasWidth", 800),
                "canvasHeight": snapshot.get("canvasHeight", 600),
                "activeLayerId": snapshot.get("activeLayerId"),
                "layers": snapshot.get("layers", []),
            })
        room_states[room] = default_state
    return room_states[room]

def save_room_snapshot(room):
    state = get_room_state(room)
    layers_snapshot = []
    for layer in state.get("layers", []):   # 注意这里用 .get 避免 KeyError
        layers_snapshot.append({
            "id": layer["id"],
            "name": layer["name"],
            "visible": layer["visible"],
            "locked": layer["locked"],
            "blend": layer["blend"],
            "opacity": layer["opacity"],
            "imageData": layer["imageData"]
        })
    snapshot = {
        "canvasWidth": state.get("canvasWidth", 800),
        "canvasHeight": state.get("canvasHeight", 600),
        "activeLayerId": state.get("activeLayerId"),
        "layers": layers_snapshot
    }
    try:
        with open(os.path.join(SNAPSHOT_DIR, f"{room}.json"), "w") as f:
            json.dump(snapshot, f)
    except Exception as e:
        print(f"保存快照失败: {e}")


def normalize_operation(op):
    op = dict(op)
    op.setdefault("opId", str(uuid4()))
    return op


def clamp_number(value, default, min_value, max_value):
    try:
        value = int(value)
    except (TypeError, ValueError):
        return default
    return max(min_value, min(max_value, value))


def get_enabled_events(state):
    disabled = set(state["event_settings"].get("disabled", []))
    return [event for event in EVENT_POOL if event["key"] not in disabled]


def pick_next_event(state):
    settings = state["event_settings"]
    enabled = get_enabled_events(state)
    if not enabled:
        return None

    next_key = settings.get("nextKey")
    if next_key:
        settings["nextKey"] = None
        if next_key in EVENT_POOL_BY_KEY and next_key not in settings["disabled"]:
            return EVENT_POOL_BY_KEY[next_key]

    return random.choice(enabled)


def normalize_event_settings(state, settings):
    current = state["event_settings"]
    duration = clamp_number(
        settings.get("duration"),
        current.get("duration", EVENT_DURATION_DEFAULT),
        EVENT_DURATION_MIN,
        EVENT_DURATION_MAX,
    )
    interval = clamp_number(
        settings.get("interval"),
        current.get("interval", EVENT_INTERVAL_DEFAULT),
        EVENT_INTERVAL_MIN,
        EVENT_INTERVAL_MAX,
    )

    disabled = settings.get("disabled")
    if not isinstance(disabled, list):
        disabled = current.get("disabled", [])

    normalized_disabled = [
        item
        for item in disabled
        if isinstance(item, str) and item in EVENT_POOL_BY_KEY
    ]

    next_key = settings.get("nextKey", current.get("nextKey"))
    if next_key not in EVENT_POOL_BY_KEY or next_key in normalized_disabled:
        next_key = None

    return {
        "duration": duration,
        "interval": interval,
        "disabled": normalized_disabled,
        "nextKey": next_key,
    }


def create_event(event_meta, duration):
    event = dict(event_meta)
    now = time.time()
    event.update({
        "id": str(uuid4()),
        "startedAt": now,
        "duration": duration,
        "endsAt": now + duration,
    })
    return event


def next_event_version(state):
    state["event_version"] = state.get("event_version", 0) + 1
    return state["event_version"]


def with_event_sync_meta(state, payload):
    synced = dict(payload)
    synced["eventVersion"] = state.get("event_version", 0)
    synced["serverNow"] = time.time()
    return synced


def serialize_event_state(state):
    active_events = state.get("active_events", [])
    return {
        "activeEvent": active_events[0] if active_events else None,
        "activeEvents": active_events,
        "nextEventAt": state.get("next_event_at"),
        "settings": state["event_settings"],
        "eventPool": EVENT_POOL,
        "eventVersion": state.get("event_version", 0),
        "sharedToolbarState": state.get("shared_toolbar_state"),
        "serverNow": time.time(),
    }


def emit_event_state(room):
    state = get_room_state(room)
    socketio.emit("event_state", serialize_event_state(state), to=room)


def emit_event_end(room, state, event):
    next_event_version(state)
    socketio.emit(
        "event_end",
        with_event_sync_meta(state, {
            "id": event["id"],
            "type": event["type"],
        }),
        to=room,
    )


def end_room_event(room, state, event):
    active_events = state.get("active_events", [])
    state["active_events"] = [
        item for item in active_events if item.get("id") != event.get("id")
    ]
    state["active_event"] = state["active_events"][0] if state["active_events"] else None
    if event.get("type") == "tool_grab" and not is_event_type_active(state, "tool_grab"):
        state["tool_grab"] = {
            "drops": [],
            "permissions": {},
            "next_drop_at": 0,
        }
        socketio.emit("tool_grab_state", state["tool_grab"], to=room)
    emit_event_end(room, state, event)


def start_room_event(room, state, now=None):
    settings = state["event_settings"]
    event_meta = pick_next_event(state)
    if not event_meta:
        state["next_event_at"] = (now or time.time()) + settings["interval"]
        emit_event_state(room)
        return None

    should_reset_history_limits = (
            event_meta["type"] == "shared_history"
            and not is_event_type_active(state, "shared_history")
    )
    event = create_event(event_meta, settings["duration"])
    event["eventVersion"] = next_event_version(state)
    state.setdefault("active_events", []).append(event)
    state["active_event"] = state["active_events"][0]
    state["next_event_at"] = (now or time.time()) + settings["interval"]
    socketio.emit("event_start", with_event_sync_meta(state, event), to=room)
    if event["type"] == "shared_history":
        if should_reset_history_limits:
            reset_history_limits_for_room(room, state)
        emit_history_limits_for_room(room, state)
    if event["type"] == "tool_grab":
        state["tool_grab"] = {
            "drops": [],
            "permissions": {},
            "next_drop_at": (now or time.time()) + TOOL_GRAB_DROP_INTERVAL,
        }
        add_tool_drops(room, TOOL_GRAB_INITIAL_DROPS, now)
    emit_event_state(room)
    return event


def ensure_event_loop(room):
    state = get_room_state(room)
    if state["event_loop_started"]:
        return

    state["event_loop_started"] = True
    socketio.start_background_task(room_event_loop, room)


def room_event_loop(room):
    while True:
        socketio.sleep(1)

        state = get_room_state(room)
        now = time.time()
        active_events = list(state.get("active_events", []))

        expired_events = [
            event for event in active_events if now >= event["endsAt"]
        ]
        for event in expired_events:
            end_room_event(room, state, event)
        if expired_events:
            emit_event_state(room)

        if is_event_type_active(state, "tool_grab"):
            cleanup_tool_grab_state(state, now)
            grab_state = get_tool_grab_state(state)
            if now >= grab_state.get("next_drop_at", 0):
                add_tool_drops(room, 1, now)
                grab_state["next_drop_at"] = now + TOOL_GRAB_DROP_INTERVAL
            else:
                emit_tool_grab_state(room)

        if now < state["next_event_at"]:
            continue

        start_room_event(room, state, now)


def pop_undo_group(state):
    if not state["done"]:
        return []

    last = state["done"].pop()
    group = [last]

    if last.get("type") == "stroke" and last.get("strokeId"):
        stroke_id = last["strokeId"]
        while (
                state["done"]
                and state["done"][-1].get("type") == "stroke"
                and state["done"][-1].get("strokeId") == stroke_id
        ):
            group.insert(0, state["done"].pop())

    return group


def is_event_type_active(state, event_type):
    return any(
        event.get("type") == event_type
        for event in state.get("active_events", [])
    )


def get_tool_grab_state(state):
    return state.setdefault("tool_grab", {
        "drops": [],
        "permissions": {},
        "next_drop_at": 0,
    })


def pick_tool_drop():
    weighted = []
    for item in TOOL_DROP_POOL:
        weighted.extend([item] * item.get("weight", 1))
    return dict(random.choice(weighted))


def create_tool_drop(now=None):
    now = now or time.time()
    tool = pick_tool_drop()
    return {
        "id": str(uuid4()),
        "tool": tool["key"],
        "category": tool["category"],
        "value": tool["value"],
        "label": tool["label"],
        "duration": TOOL_GRAB_PERMISSION_DURATION,
        "createdAt": now,
        "expiresAt": now + TOOL_GRAB_DROP_TTL,
        "x": random.randint(8, 84),
        "fallDuration": random.uniform(45, 60),
        "drift": random.randint(-28, 28),
    }


def cleanup_tool_grab_state(state, now=None):
    now = now or time.time()
    grab_state = get_tool_grab_state(state)
    grab_state["drops"] = [
        drop for drop in grab_state.get("drops", [])
        if drop.get("expiresAt", 0) > now
    ]
    permissions = grab_state.setdefault("permissions", {})
    for sid in list(permissions.keys()):
        permissions[sid] = {
            key: permission
            for key, permission in permissions[sid].items()
            if permission.get("expiresAt", 0) > now
        }
        if not permissions[sid]:
            permissions.pop(sid, None)


def emit_tool_grab_state(room):
    state = get_room_state(room)
    cleanup_tool_grab_state(state)
    socketio.emit("tool_grab_state", get_tool_grab_state(state), to=room)


def add_tool_drops(room, count, now=None):
    state = get_room_state(room)
    grab_state = get_tool_grab_state(state)
    now = now or time.time()
    for _ in range(count):
        grab_state.setdefault("drops", []).append(create_tool_drop(now))
    emit_tool_grab_state(room)


def user_has_tool_permission(state, sid, key):
    if not is_event_type_active(state, "tool_grab"):
        return True
    if key == "brush:pencil":
        return True
    cleanup_tool_grab_state(state)
    return key in get_tool_grab_state(state).get("permissions", {}).get(sid, {})


def pop_random_grabbed_permission(grab_state, sid):
    user_permissions = grab_state.setdefault("permissions", {}).get(sid, {})
    removable_keys = [
        key for key in user_permissions.keys()
        if key != "brush:pencil"
    ]
    if not removable_keys:
        return None

    removed_key = random.choice(removable_keys)
    return user_permissions.pop(removed_key)


def normalize_shared_toolbar_state(value):
    if not isinstance(value, dict):
        return {}

    return {
        key: section
        for key, section in value.items()
        if isinstance(key, str) and isinstance(section, dict)
    }


def get_history_limit(state, sid):
    limits = state.setdefault("history_limits", {})
    if sid not in limits:
        limits[sid] = {
            "undo": {
                "tokens": HISTORY_ACTION_LIMIT,
                "last": time.time(),
            },
            "redo": {
                "tokens": HISTORY_ACTION_LIMIT,
                "last": time.time(),
            },
        }

    if "tokens" in limits[sid]:
        old_limit = limits[sid]
        limits[sid] = {
            "undo": dict(old_limit),
            "redo": {
                "tokens": HISTORY_ACTION_LIMIT,
                "last": time.time(),
            },
        }

    refill_history_limit(limits[sid]["undo"])
    refill_history_limit(limits[sid]["redo"])
    return limits[sid]


def refill_history_limit(limit):
    now = time.time()
    elapsed = now - limit.get("last", now)
    recovered = int(elapsed // HISTORY_ACTION_RECOVER_SECONDS)
    if recovered <= 0:
        return

    limit["tokens"] = min(
        HISTORY_ACTION_LIMIT,
        int(limit.get("tokens", HISTORY_ACTION_LIMIT)) + recovered,
    )
    limit["last"] = (
        now
        if limit["tokens"] >= HISTORY_ACTION_LIMIT
        else limit.get("last", now) + recovered * HISTORY_ACTION_RECOVER_SECONDS
    )


def emit_history_limit(state, sid=None):
    target_sid = sid or request.sid
    limit = get_history_limit(state, target_sid)
    socketio.emit(
        "history_quota",
        {
            "undoTokens": int(limit["undo"]["tokens"]),
            "redoTokens": int(limit["redo"]["tokens"]),
            "maxTokens": HISTORY_ACTION_LIMIT,
            "recoverSeconds": HISTORY_ACTION_RECOVER_SECONDS,
            "serverNow": time.time(),
        },
        to=target_sid,
    )


def emit_history_limits_for_room(room, state):
    for sid, meta in socket_users.items():
        if meta.get("room") == room:
            emit_history_limit(state, sid)


def reset_history_limits_for_room(room, state):
    limits = state.setdefault("history_limits", {})
    now = time.time()
    for sid, meta in socket_users.items():
        if meta.get("room") != room:
            continue
        limits[sid] = {
            "undo": {
                "tokens": HISTORY_ACTION_LIMIT,
                "last": now,
            },
            "redo": {
                "tokens": HISTORY_ACTION_LIMIT,
                "last": now,
            },
        }


def consume_history_token(state, action):
    limit = get_history_limit(state, request.sid)
    action_limit = limit[action]
    if action_limit["tokens"] <= 0:
        emit_history_limit(state)
        return False

    action_limit["tokens"] -= 1
    emit_history_limit(state)
    return True


@app.route("/")
def index():
    return render_template("index.html")


@socketio.on("join_room")
def handle_join(data):
    room = data.get("room")
    if not room:
        return

    join_room(room)
    username = data.get("username") or "匿名画师"
    socket_users[request.sid] = {
        "room": room,
        "username": username,
    }
    state = get_room_state(room)
    ensure_event_loop(room)

    emit("sync_history", {
        "operations": state["done"],
    })
    # 在 handle_join 中，发送 sync_history 之后，发送图层快照
    snapshot = load_room_snapshot(room)
    if snapshot:
        emit("load_snapshot", snapshot)

    # 在 handle_join 中，发送快照后补充：
    emit("canvas_resized", {
        "width": state.get("canvasWidth", 800),
        "height": state.get("canvasHeight", 600)
    })



    emit("event_state", serialize_event_state(state))

    for event in state.get("active_events", []):
        emit("event_start", with_event_sync_meta(state, event))

    emit_history_limit(state)
    if is_event_type_active(state, "shared_toolbar") and state.get("shared_toolbar_state"):
        emit("shared_tool_state", {
            "state": state["shared_toolbar_state"],
            "serverNow": time.time(),
        })
    if is_event_type_active(state, "tool_grab"):
        emit("tool_grab_state", get_tool_grab_state(state))

    # 发送聊天历史（最近50条）
    chat_history = state.get("chat_history", [])
    emit("chat_history", {
        "messages": chat_history[-50:] if chat_history else [],
    })

    # 广播系统消息
    system_msg = {
        "username": "系统",
        "message": f"⚠️ 用户 {username} 加入了房间",
        "type": "system",
        "timestamp": time.time(),
    }
    state["chat_history"].append(system_msg)
    if len(state["chat_history"]) > 200:
        state["chat_history"] = state["chat_history"][-200:]
    socketio.emit("receive_message", system_msg, to=room)


@socketio.on("event_settings")
def handle_event_settings(data):
    room = data.get("room")
    settings = data.get("settings")
    if not room or not isinstance(settings, dict):
        return

    state = get_room_state(room)
    now = time.time()
    old_settings = dict(state["event_settings"])
    normalized = normalize_event_settings(state, settings)
    state["event_settings"].update(normalized)

    interval_changed = (
            "interval" in settings
            and normalized["interval"] != old_settings.get("interval")
    )

    if interval_changed:
        state["next_event_at"] = now + normalized["interval"]

    next_event_version(state)
    emit_event_state(room)


@socketio.on("force_next_event")
def handle_force_next_event(data):
    room = data.get("room")
    if not room:
        return

    state = get_room_state(room)
    start_room_event(room, state, time.time())


@socketio.on("force_end_event")
def handle_force_end_event(data):
    room = data.get("room")
    if not room:
        return

    state = get_room_state(room)
    active_events = list(state.get("active_events", []))
    if not active_events:
        emit_event_state(room)
        return

    event_id = data.get("eventId")
    if data.get("all") or not event_id:
        for event in active_events:
            end_room_event(room, state, event)
    else:
        for event in active_events:
            if event.get("id") == event_id:
                end_room_event(room, state, event)
                break

    emit_event_state(room)


@socketio.on("draw")
def handle_draw(data):
    room = data.get("room")
    if not room:
        return

    state = get_room_state(room)
    mode = data.get("mode")
    preset = data.get("preset")
    if mode == "eraser":
        tool_key = f"eraser:{preset or 'soft-eraser'}"
    else:
        tool_key = f"brush:{preset or 'pencil'}"
    if not user_has_tool_permission(state, request.sid, tool_key):
        emit_tool_grab_state(room)
        return

    op = normalize_operation({
        "type": "stroke",
        "layerId": data.get("layerId"),
        "strokeId": data.get("strokeId"),
        "x1": data.get("x1"),
        "y1": data.get("y1"),
        "x2": data.get("x2"),
        "y2": data.get("y2"),
        "color": data.get("color"),
        "size": data.get("size"),
        "opacity": data.get("opacity"),
        "preset": data.get("preset"),
        "mode": data.get("mode"),
    })

    state["done"].append(op)
    state["undone"].clear()

    socketio.emit("draw", op, to=room, include_self=False)


@socketio.on("operation")
def handle_operation(data):
    room = data.get("room")
    operation = data.get("operation")
    if not room or not operation:
        return

    state = get_room_state(room)
    op = normalize_operation(operation)
    if op.get("type") == "layer_create" and not user_has_tool_permission(state, request.sid, "layer:create"):
        emit_tool_grab_state(room)
        return
    if (
            op.get("type") == "layer_update"
            and isinstance(op.get("changes"), dict)
            and "blend" in op["changes"]
            and not user_has_tool_permission(state, request.sid, "layer:blend")
    ):
        emit_tool_grab_state(room)
        return

    state["done"].append(op)
    state["undone"].clear()

    socketio.emit("operation", op, to=room, include_self=False)


@socketio.on("clear")
def handle_clear(data):
    room = data.get("room")
    layer_id = data.get("layerId")
    if not room or layer_id is None:
        return

    state = get_room_state(room)
    op = normalize_operation({
        "type": "clear_layer",
        "layerId": layer_id,
    })

    state["done"].append(op)
    state["undone"].clear()

    socketio.emit("clear", op, to=room, include_self=False)


@socketio.on("shared_tool_state")
def handle_shared_tool_state(data):
    room = data.get("room")
    if not room:
        return

    state = get_room_state(room)
    if not is_event_type_active(state, "shared_toolbar"):
        return

    tool_state = normalize_shared_toolbar_state(data.get("state"))
    if not tool_state:
        return

    state["shared_toolbar_state"] = tool_state
    username = socket_users.get(request.sid, {}).get("username", "有画师")
    label = data.get("label") or "工具"
    payload = {
        "state": tool_state,
        "username": username,
        "label": label,
        "serverNow": time.time(),
    }
    socketio.emit("shared_tool_state", payload, to=room, include_self=False)
    socketio.emit(
        "room_toast",
        {"message": f"{username} 切换到了{label}"},
        to=room,
    )


@socketio.on("claim_tool_drop")
def handle_claim_tool_drop(data):
    room = data.get("room")
    drop_id = data.get("dropId")
    if not room or not drop_id:
        return

    state = get_room_state(room)
    if not is_event_type_active(state, "tool_grab"):
        return

    now = time.time()
    cleanup_tool_grab_state(state, now)
    grab_state = get_tool_grab_state(state)
    drop = next(
        (item for item in grab_state.get("drops", []) if item.get("id") == drop_id),
        None,
    )
    if not drop:
        emit_tool_grab_state(room)
        return

    grab_state["drops"] = [
        item for item in grab_state.get("drops", []) if item.get("id") != drop_id
    ]
    username = socket_users.get(request.sid, {}).get("username", "有画师")
    if drop.get("category") == "bomb":
        removed = pop_random_grabbed_permission(grab_state, request.sid)
        message = (
            f"{username} 踩到炸弹，失去了{removed['label']}"
            if removed
            else f"{username} 踩到炸弹，但没有可失去的工具"
        )
        socketio.emit(
            "room_toast",
            {"message": message},
            to=room,
        )
        socketio.emit(
            "tool_drop_claimed",
            {
                "dropId": drop_id,
                "ownerSid": request.sid,
                "tool": drop["tool"],
                "label": drop["label"],
            },
            to=room,
        )
        emit_tool_grab_state(room)
        return

    permission = {
        "tool": drop["tool"],
        "label": drop["label"],
        "category": drop["category"],
        "value": drop["value"],
        "expiresAt": now + int(drop.get("duration", TOOL_GRAB_PERMISSION_DURATION)),
        "ownerSid": request.sid,
    }
    grab_state.setdefault("permissions", {}).setdefault(request.sid, {})[drop["tool"]] = permission
    socketio.emit(
        "room_toast",
        {"message": f"{username} 获得{drop['label']}"},
        to=room,
    )
    socketio.emit(
        "tool_drop_claimed",
        {
            "dropId": drop_id,
            "ownerSid": request.sid,
            "tool": drop["tool"],
            "label": drop["label"],
        },
        to=room,
    )
    emit_tool_grab_state(room)


@socketio.on("undo")
def handle_undo(data):
    room = data.get("room")
    if not room:
        return

    state = get_room_state(room)
    if not is_event_type_active(state, "shared_history"):
        return

    if not state["done"]:
        emit_history_limit(state)
        return
    if not consume_history_token(state, "undo"):
        return

    group = pop_undo_group(state)
    if not group:
        return

    state["undone"].append(group)
    socketio.emit("history_changed", {
        "operations": state["done"],
    }, to=room)
    username = socket_users.get(request.sid, {}).get("username", "有画师")
    socketio.emit(
        "room_toast",
        {"message": f"{username} 撤回了一笔"},
        to=room,
    )


@socketio.on("redo")
def handle_redo(data):
    room = data.get("room")
    if not room:
        return

    state = get_room_state(room)
    if not is_event_type_active(state, "shared_history"):
        return

    if not state["undone"]:
        emit_history_limit(state)
        return
    if not consume_history_token(state, "redo"):
        return

    state["done"].extend(state["undone"].pop())
    socketio.emit("history_changed", {
        "operations": state["done"],
    }, to=room)
    username = socket_users.get(request.sid, {}).get("username", "有画师")
    socketio.emit(
        "room_toast",
        {"message": f"{username} 重做了一笔"},
        to=room,
    )


@socketio.on("send_message")
def handle_send_message(data):
    room = data.get("room")
    message = data.get("message", "").strip()
    username = data.get("username") or "匿名用户"
    msg_type = data.get("type", "user")  # 支持 type 字段，默认为 "user"

    if not room or not message:
        return

    now = time.time()
    state = get_room_state(room)
    rate_limit = state.get("message_rate_limit", {})

    # 检查频率限制：每个用户每秒最多2条消息
    user_key = f"{request.sid}_{int(now)}"
    user_second_key = f"{request.sid}_{int(now)}"

    if user_second_key in rate_limit:
        if rate_limit[user_second_key] >= 2:
            # 频率限制，忽略消息（不发送任何反馈）
            return
        rate_limit[user_second_key] += 1
    else:
        rate_limit[user_second_key] = 1

    # 清理旧的频率限制记录（超过3秒的）
    for key in list(rate_limit.keys()):
        try:
            ts = int(key.split('_')[-1])
            if now - ts > 3:
                del rate_limit[key]
        except:
            pass

    # 创建消息对象
    chat_msg = {
        "username": username,
        "message": message,
        "type": msg_type,  # 使用从数据中传过来的 type 字段
        "timestamp": now,
    }

    # 保存到历史（最多200条）
    state["chat_history"].append(chat_msg)
    if len(state["chat_history"]) > 200:
        state["chat_history"] = state["chat_history"][-200:]

    # 广播消息到房间
    socketio.emit("receive_message", chat_msg, to=room)


@socketio.on("get_chat_history")
def handle_get_chat_history(data):
    room = data.get("room")
    if not room:
        return

    state = get_room_state(room)
    chat_history = state.get("chat_history", [])

    # 返回最近50条消息
    emit("chat_history", {
        "messages": chat_history[-50:] if chat_history else [],
    })


@socketio.on("disconnect")
def handle_disconnect():
    socket_users.pop(request.sid, None)


@socketio.on("get_custom_challenges")
def handle_get_custom_challenges(data):
    room = data.get("room")
    if not room:
        return
    state = get_room_state(room)
    emit("custom_challenges_list", {"list": state["custom_challenges"]})


@socketio.on("add_custom_challenge")
def handle_add_custom_challenge(data):
    room = data.get("room")
    text = data.get("text", "").strip()
    image_data = data.get("image_data")  # base64 字符串，可选
    if not room or not text:
        return
    state = get_room_state(room)
    new_id = str(uuid4())
    state["custom_challenges"].append({
        "id": new_id,
        "text": text,
        "image_data": image_data,
        "created_by": socket_users.get(request.sid, {}).get("username", "匿名")
    })
    # 广播更新给房间所有人
    socketio.emit("custom_challenges_list", {"list": state["custom_challenges"]}, to=room)


@socketio.on("remove_custom_challenge")
def handle_remove_custom_challenge(data):
    room = data.get("room")
    challenge_id = data.get("id")
    if not room or not challenge_id:
        return
    state = get_room_state(room)
    state["custom_challenges"] = [c for c in state["custom_challenges"] if c["id"] != challenge_id]
    socketio.emit("custom_challenges_list", {"list": state["custom_challenges"]}, to=room)


def challenge_countdown(room, ends_at):
    while True:
        socketio.sleep(1)
        state = get_room_state(room)
        if not state["challenge"]["active"]:
            break
        if time.time() >= ends_at:
            # 挑战结束
            state["challenge"]["active"] = False
            socketio.emit("challenge_end", {}, to=room)
            break


@socketio.on("start_challenge")
def handle_start_challenge(data):
    room = data.get("room")
    if not room:
        return
    state = get_room_state(room)
    if state["challenge"]["active"]:
        emit("challenge_error", {"message": "已有进行中的挑战"})
        return

    duration = clamp_number(data.get("duration", 180), 180, 30, 600)
    selected_categories = data.get("selected_categories", [])  # 前端勾选的分类名列表
    use_custom = data.get("use_custom", True)

    candidates = []
    # 1. 从预设分类中获取题目
    if selected_categories:
        all_presets = scan_preset_challenges()  # 每次调用都重新扫描（生产环境可缓存）
        for cat in selected_categories:
            if cat in all_presets:
                candidates.extend(all_presets[cat])
    # 2. 自定义题目
    if use_custom:
        candidates.extend(state["custom_challenges"])

    if not candidates:
        emit("challenge_error", {"message": "没有可用的题目，请勾选预设分类或启用自定义题目"})
        return

    chosen = random.choice(candidates)
    now = time.time()
    ends_at = now + duration
    state["challenge"] = {
        "active": True,
        "topic": chosen["text"],
        "image_data": chosen.get("image_data"),
        "started_at": now,
        "duration": duration,
        "ends_at": ends_at,
        "initiator_sid": request.sid,
    }
    socketio.emit("challenge_start", {
        "topic": chosen["text"],
        "image_data": chosen.get("image_data"),
        "duration": duration,
        "ends_at": ends_at,
        "server_now": now,
    }, to=room)
    socketio.start_background_task(challenge_countdown, room, ends_at)

@socketio.on("cancel_challenge")
def handle_cancel_challenge(data):
    room = data.get("room")
    if not room:
        return
    state = get_room_state(room)
    if state["challenge"]["active"]:
        state["challenge"]["active"] = False
        socketio.emit("challenge_end", {"cancelled": True}, to=room)

@socketio.on("send_emoji_effect")
def handle_send_emoji_effect(data):
    room = data.get("room")
    if not room:
        return
    # 广播给房间内所有人（包括发送者自己）
    socketio.emit("show_emoji_effect", {
        "emoji": data.get("emoji"),
        "xPercent": data.get("xPercent"),
        "yPercent": data.get("yPercent")
    }, to=room)

@socketio.on("save_snapshot")
def handle_save_snapshot(data):
    room = data.get("room")
    if not room:
        return
    state = get_room_state(room)
    # 更新内存中的图层数据
    state["canvasWidth"] = data["canvasWidth"]
    state["canvasHeight"] = data["canvasHeight"]
    state["activeLayerId"] = data["activeLayerId"]
    state["layers"] = data["layers"]
    # 异步保存到磁盘（或立即保存）
    save_room_snapshot(room)


@socketio.on("resize_canvas")
def handle_resize_canvas(data):
    room = data.get("room")
    if not room:
        return
    width = data.get("width")
    height = data.get("height")
    if not isinstance(width, int) or not isinstance(height, int):
        return
    state = get_room_state(room)
    # 更新房间状态中的画布尺寸
    state["canvasWidth"] = width
    state["canvasHeight"] = height
    # 广播给房间内所有其他用户（include_self=False）
    socketio.emit("canvas_resized", {
        "width": width,
        "height": height
    }, to=room, include_self=False)
if __name__ == "__main__":
    socketio.run(
        app,
        host="0.0.0.0",
        port=5000,
        debug=True,
        allow_unsafe_werkzeug=True,
    )
