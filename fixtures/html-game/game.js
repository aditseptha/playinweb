const field = document.getElementById("field");
const box = document.getElementById("box");
const scoreEl = document.getElementById("score");
const timeEl = document.getElementById("time");
const endEl = document.getElementById("end");

let score = 0;
let left = 30;
let tick;

function move() {
  const maxX = field.clientWidth - box.offsetWidth;
  const maxY = field.clientHeight - box.offsetHeight;
  box.style.left = Math.floor(Math.random() * Math.max(maxX, 0)) + "px";
  box.style.top = Math.floor(Math.random() * Math.max(maxY, 0)) + "px";
}

function start() {
  score = 0;
  left = 30;
  scoreEl.textContent = "0";
  timeEl.textContent = "30";
  endEl.hidden = true;
  box.disabled = false;
  move();
  clearInterval(tick);
  tick = setInterval(() => {
    left -= 1;
    timeEl.textContent = String(left);
    if (left <= 0) {
      clearInterval(tick);
      box.disabled = true;
      endEl.hidden = false;
    }
  }, 1000);
}

box.addEventListener("click", () => {
  if (left <= 0) {
    start();
    return;
  }
  score += 1;
  scoreEl.textContent = String(score);
  move();
});

start();
window.addEventListener("resize", move);
