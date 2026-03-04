const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const addKeyframeBtn = document.getElementById('addKeyframeBtn');
const clearBtn = document.getElementById('clearBtn');
const fpsInput = document.getElementById('fpsInput');
const durationInput = document.getElementById('durationInput');
const timeInput = document.getElementById('timeInput');
const timeValue = document.getElementById('timeValue');
const timelineBody = document.getElementById('timelineBody');

const state = {
  duration: ScratchParity.toNumber(durationInput.value),
  fps: ScratchParity.toNumber(fpsInput.value),
  currentTime: 0,
  isPlaying: false,
  keyframes: [
    { time: 0, x: -120, y: -20, rotation: -10, scale: 1 },
    { time: 2, x: 0, y: 70, rotation: 10, scale: 1.1 },
    { time: 4, x: 130, y: -10, rotation: 0, scale: 1 }
  ],
  drag: { active: false, offsetX: 0, offsetY: 0 },
  puppet: { x: 0, y: 0, rotation: 0, scale: 1 }
};

const STAGE_WIDTH = 480;
const STAGE_HEIGHT = 360;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function scratchToCanvas(x, y) {
  return {
    x: canvas.width / 2 + ScratchParity.toNumber(x) * (canvas.width / STAGE_WIDTH),
    y: canvas.height / 2 - ScratchParity.toNumber(y) * (canvas.height / STAGE_HEIGHT)
  };
}

function canvasToScratch(x, y) {
  return {
    x: ((x - canvas.width / 2) * STAGE_WIDTH) / canvas.width,
    y: ((canvas.height / 2 - y) * STAGE_HEIGHT) / canvas.height
  };
}

function sortKeyframes() {
  state.keyframes.sort((a, b) => a.time - b.time);
}

function poseAt(time) {
  sortKeyframes();
  if (state.keyframes.length === 0) {
    return { x: 0, y: 0, rotation: 0, scale: 1 };
  }

  const first = state.keyframes[0];
  const last = state.keyframes[state.keyframes.length - 1];
  if (time <= first.time) return { ...first };
  if (time >= last.time) return { ...last };

  let left = first;
  let right = last;
  for (let i = 0; i < state.keyframes.length - 1; i += 1) {
    const a = state.keyframes[i];
    const b = state.keyframes[i + 1];
    if (time >= a.time && time <= b.time) {
      left = a;
      right = b;
      break;
    }
  }

  const t = (time - left.time) / (right.time - left.time || 1);
  return {
    x: left.x + (right.x - left.x) * t,
    y: left.y + (right.y - left.y) * t,
    rotation: left.rotation + (right.rotation - left.rotation) * t,
    scale: left.scale + (right.scale - left.scale) * t
  };
}

function drawGrid() {
  ctx.save();
  ctx.strokeStyle = '#d3d3d6';
  ctx.lineWidth = 1;

  for (let x = 0; x <= canvas.width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#9696a8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();
  ctx.restore();
}

function drawPuppet(pose) {
  const p = scratchToCanvas(pose.x, pose.y);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(ScratchParity.degToRad(pose.rotation));
  ctx.scale(pose.scale * 2, pose.scale * 2);

  ctx.fillStyle = '#4f46e5';
  ctx.fillRect(-20, -35, 40, 70);

  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(0, -50, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#312e81';
  ctx.fillRect(-35, -15, 15, 10);
  ctx.fillRect(20, -15, 15, 10);
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawPuppet(state.puppet);
}

function setCurrentTime(t) {
  state.currentTime = clamp(t, 0, state.duration);
  timeInput.value = state.currentTime.toFixed(2);
  timeValue.value = `${state.currentTime.toFixed(2)}s`;
  state.puppet = poseAt(state.currentTime);
  render();
}

function addOrReplaceKeyframe() {
  const roundedTime = Number(state.currentTime.toFixed(2));
  const newFrame = { time: roundedTime, ...state.puppet };
  const idx = state.keyframes.findIndex((f) => f.time === roundedTime);
  if (idx >= 0) {
    state.keyframes[idx] = newFrame;
  } else {
    state.keyframes.push(newFrame);
  }
  sortKeyframes();
  refreshTimeline();
}

function refreshTimeline() {
  timelineBody.innerHTML = '';
  state.keyframes.forEach((frame, index) => {
    const row = document.createElement('tr');
    const fields = ['time', 'x', 'y', 'rotation', 'scale'];

    fields.forEach((key) => {
      const cell = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'number';
      input.step = key === 'scale' ? '0.1' : '1';
      input.className = 'timeline-input';
      input.value = frame[key];
      input.addEventListener('change', () => {
        frame[key] = ScratchParity.toNumber(input.value);
        if (key === 'time') {
          frame.time = clamp(frame.time, 0, state.duration);
          sortKeyframes();
          refreshTimeline();
        }
        setCurrentTime(state.currentTime);
      });
      cell.appendChild(input);
      row.appendChild(cell);
    });

    const actionCell = document.createElement('td');
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Delete';
    removeBtn.addEventListener('click', () => {
      state.keyframes.splice(index, 1);
      refreshTimeline();
      setCurrentTime(state.currentTime);
    });
    actionCell.appendChild(removeBtn);
    row.appendChild(actionCell);

    timelineBody.appendChild(row);
  });
}

let rafId = null;
let lastFrameMs = 0;
function playLoop(ts) {
  if (!state.isPlaying) return;
  const frameMs = 1000 / state.fps;
  if (!lastFrameMs || ts - lastFrameMs >= frameMs) {
    const next = state.currentTime + 1 / state.fps;
    if (next > state.duration) {
      setCurrentTime(0);
    } else {
      setCurrentTime(next);
    }
    lastFrameMs = ts;
  }
  rafId = requestAnimationFrame(playLoop);
}

playBtn.addEventListener('click', () => {
  state.isPlaying = true;
  lastFrameMs = 0;
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(playLoop);
});

stopBtn.addEventListener('click', () => {
  state.isPlaying = false;
  cancelAnimationFrame(rafId);
});

addKeyframeBtn.addEventListener('click', addOrReplaceKeyframe);

clearBtn.addEventListener('click', () => {
  state.keyframes = [];
  refreshTimeline();
  setCurrentTime(state.currentTime);
});

timeInput.addEventListener('input', () => {
  setCurrentTime(ScratchParity.toNumber(timeInput.value));
});

durationInput.addEventListener('change', () => {
  state.duration = Math.max(0.1, ScratchParity.toNumber(durationInput.value) || 4);
  durationInput.value = state.duration;
  timeInput.max = String(state.duration);
  state.keyframes.forEach((k) => {
    k.time = clamp(k.time, 0, state.duration);
  });
  sortKeyframes();
  refreshTimeline();
  setCurrentTime(state.currentTime);
});

fpsInput.addEventListener('change', () => {
  state.fps = clamp(ScratchParity.toNumber(fpsInput.value) || 24, 1, 60);
  fpsInput.value = state.fps;
});

canvas.addEventListener('pointerdown', (event) => {
  const rect = canvas.getBoundingClientRect();
  const cx = (event.clientX - rect.left) * (canvas.width / rect.width);
  const cy = (event.clientY - rect.top) * (canvas.height / rect.height);
  const p = scratchToCanvas(state.puppet.x, state.puppet.y);
  const hit = Math.hypot(cx - p.x, cy - p.y) < 70;
  if (hit) {
    state.drag.active = true;
    state.drag.offsetX = p.x - cx;
    state.drag.offsetY = p.y - cy;
  }
});

window.addEventListener('pointerup', () => {
  state.drag.active = false;
});

canvas.addEventListener('pointermove', (event) => {
  if (!state.drag.active || state.isPlaying) return;
  const rect = canvas.getBoundingClientRect();
  const cx = (event.clientX - rect.left) * (canvas.width / rect.width);
  const cy = (event.clientY - rect.top) * (canvas.height / rect.height);
  const s = canvasToScratch(cx + state.drag.offsetX, cy + state.drag.offsetY);
  state.puppet.x = Math.round(s.x);
  state.puppet.y = Math.round(s.y);
  render();
});

setCurrentTime(0);
refreshTimeline();
