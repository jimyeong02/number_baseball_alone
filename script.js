const MAX_ATTEMPTS = 10;
let digitLength = Number(localStorage.getItem("nb_digit_length") || 4);
if (![3,4,5].includes(digitLength)) digitLength = 4;

let secret = "";
let guess = "";
let attempts = 0;
let wins = Number(localStorage.getItem("nb_wins") || 0);
let best = Number(localStorage.getItem(`nb_best_${digitLength}`) || 0);
let games = Number(localStorage.getItem("nb_games") || 0);
let soundOn = localStorage.getItem("nb_sound") !== "off";

const $ = (id) => document.getElementById(id);
const keypad = $("keypad");
const guessDisplay = $("guessDisplay");
const history = $("history");
const emptyHistory = $("emptyHistory");
const resultBanner = $("resultBanner");
const resultText = $("resultText");
const modal = $("modal");

function makeSecret(){
  const nums = [...Array(10).keys()];
  for(let i=nums.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [nums[i],nums[j]]=[nums[j],nums[i]];
  }
  // 첫 자리는 0이 되지 않도록 함
  if(nums[0]===0){
    const nonZeroIndex = nums.findIndex(n=>n!==0);
    [nums[0],nums[nonZeroIndex]]=[nums[nonZeroIndex],nums[0]];
  }
  return nums.slice(0,digitLength).join("");
}

function updateStats(){
  $("attempts").textContent = attempts;
  $("remaining").textContent = `${MAX_ATTEMPTS-attempts} CHANCES`;
  $("wins").textContent = wins;
  $("best").textContent = best || "—";
  $("winRate").textContent = games ? Math.round(wins/games*100) : 0;
  $("modeStat").textContent = `${digitLength}D`;
  $("modeSub").textContent = "NO DUP";
  $("digitHint").textContent = `${digitLength} DIGIT • NO DUPLICATES`;
  $("resultText").textContent = `${digitLength}자리 숫자를 입력하세요`;
}

function renderSecretDots(){
  const dots = $("secretDots");
  dots.innerHTML = Array.from({length:digitLength},()=>"<span>?</span>").join("");
}

function renderGuess(){
  guessDisplay.textContent = guess.padEnd(digitLength,"-");
  document.querySelectorAll("#keypad [data-num]").forEach(btn=>{
    btn.disabled = guess.includes(btn.dataset.num) || guess.length>=digitLength;
  });
  $("judgeBtn").disabled = guess.length !== digitLength;
}

function setStatus(text, good=false){
  $("gameStatus").textContent = text;
  $("gameStatus").style.color = good ? "var(--green)" : "var(--accent)";
  $("gameStatus").style.borderColor = good ? "rgba(82,225,155,.28)" : "rgba(255,91,56,.28)";
  $("gameStatus").style.background = good ? "rgba(82,225,155,.08)" : "rgba(255,91,56,.08)";
}

function beep(freq=440,duration=.06){
  if(!soundOn) return;
  try{
    const C = window.AudioContext || window.webkitAudioContext;
    if(!C) return;
    const ctx = new C(), osc=ctx.createOscillator(), gain=ctx.createGain();
    osc.frequency.value=freq; osc.type="sine";
    gain.gain.setValueAtTime(.045,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime+duration);
  }catch(e){}
}

function addHistory(g,s,b){
  emptyHistory.style.display="none";
  const row=document.createElement("div");
  row.className="history-row";
  const badge = (cls,text)=>`<span class="badge ${cls}">${text}</span>`;
  row.innerHTML=`<span class="num">${String(attempts).padStart(2,"0")}</span>
    <span class="guess">${g}</span>
    <span class="badges">${badge("s",s+" S")}${badge("b",b+" B")}${s===0&&b===0?badge("o","OUT"):""}</span>`;
  history.prepend(row);
}

function judge(){
  if(guess.length!==digitLength){
    resultText.textContent=`${digitLength}자리 숫자를 모두 입력하세요`;
    resultBanner.classList.remove("flash"); void resultBanner.offsetWidth; resultBanner.classList.add("flash");
    beep(180,.1); return;
  }

  attempts++;
  let s=0,b=0;
  for(let i=0;i<digitLength;i++){
    if(guess[i]===secret[i]) s++;
    else if(secret.includes(guess[i])) b++;
  }

  addHistory(guess,s,b);
  $("inning").textContent=String(attempts).padStart(2,"0");
  resultText.textContent = s===digitLength
    ? "완벽한 타격! 홈런입니다!"
    : `${s} 스트라이크 · ${b} 볼${s===0&&b===0?" · OUT":""}`;

  resultBanner.classList.remove("flash"); void resultBanner.offsetWidth; resultBanner.classList.add("flash");
  const ball=$("ball"); ball.classList.remove("pitch"); void ball.offsetWidth; ball.classList.add("pitch");
  beep(s===digitLength?880:520,.1);

  guess="";
  renderGuess();
  updateStats();

  if(s===digitLength) endGame(true);
  else if(attempts>=MAX_ATTEMPTS) endGame(false);
}

function endGame(win){
  games++;
  localStorage.setItem("nb_games",games);

  if(win){
    wins++;
    if(!best || attempts<best) best=attempts;
    localStorage.setItem("nb_wins",wins);
    localStorage.setItem(`nb_best_${digitLength}`,best);
    $("modalIcon").textContent="🏆";
    $("modalKicker").textContent="HOME RUN";
    $("modalTitle").textContent="YOU WIN!";
    $("modalMessage").textContent=`${attempts}번째 타석에서 ${digitLength}자리 정답을 맞혔습니다.`;
    setStatus("HOME RUN",true);
  }else{
    $("modalIcon").textContent="⚾";
    $("modalKicker").textContent="GAME OVER";
    $("modalTitle").textContent="STRIKE OUT";
    $("modalMessage").textContent=`10번의 기회를 모두 사용했습니다.`;
    setStatus("GAME OVER");
  }

  $("modalSecret").textContent=secret;
  updateStats();
  setTimeout(()=>modal.classList.remove("hidden"),500);
}

function selectDigitLength(len){
  if(![3,4,5].includes(len)) return;
  digitLength=len;
  localStorage.setItem("nb_digit_length", String(len));

  document.querySelectorAll(".digit-option").forEach(btn=>{
    btn.classList.toggle("active", Number(btn.dataset.digit)===digitLength);
  });

  newGame();
}

function newGame(){
  secret=makeSecret();
  guess="";
  attempts=0;

  history.innerHTML="";
  emptyHistory.style.display="";
  $("inning").textContent="01";
  renderSecretDots();
  setStatus("PLAY BALL",false);
  resultText.textContent=`${digitLength}자리 숫자를 입력하세요`;
  $("modalSecret").textContent=secret;
  modal.classList.add("hidden");
  renderGuess();
  updateStats();
  beep(660,.06);
}

keypad.addEventListener("click",(e)=>{
  const btn=e.target.closest("[data-num]");
  if(!btn || guess.length>=digitLength || guess.includes(btn.dataset.num)) return;

  // 첫 숫자 0 금지
  if(guess.length===0 && btn.dataset.num==="0"){
    resultText.textContent="첫 번째 숫자는 0이 될 수 없습니다";
    beep(180,.05);
    return;
  }

  guess += btn.dataset.num;
  renderGuess();
  beep(330,.04);
});

$("backspaceBtn").addEventListener("click",()=>{
  guess=guess.slice(0,-1);
  renderGuess();
  beep(220,.04);
});

$("clearBtn").addEventListener("click",()=>{
  guess="";
  renderGuess();
  beep(180,.04);
});

$("judgeBtn").addEventListener("click",judge);
$("newGameBtn").addEventListener("click",newGame);
$("modalNewGame").addEventListener("click",newGame);

$("soundBtn").addEventListener("click",()=>{
  soundOn=!soundOn;
  localStorage.setItem("nb_sound",soundOn?"on":"off");
  $("soundBtn").textContent=soundOn?"🔊":"🔇";
});

document.querySelectorAll(".digit-option").forEach(btn=>{
  btn.addEventListener("click",()=>selectDigitLength(Number(btn.dataset.digit)));
});

document.addEventListener("keydown",(e)=>{
  if(e.key>="0"&&e.key<="9"){
    if(guess.length<digitLength && !guess.includes(e.key)){
      if(guess.length===0 && e.key==="0"){
        resultText.textContent="첫 번째 숫자는 0이 될 수 없습니다";
        return;
      }
      guess+=e.key;
      renderGuess();
      beep(330,.04);
    }
  } else if(e.key==="Backspace"){
    guess=guess.slice(0,-1);
    renderGuess();
  } else if(e.key==="Enter"){
    judge();
  } else if(e.key==="Escape"){
    guess="";
    renderGuess();
  }
});

$("soundBtn").textContent=soundOn?"🔊":"🔇";
document.querySelectorAll(".digit-option").forEach(btn=>{
  btn.classList.toggle("active", Number(btn.dataset.digit)===digitLength);
});
newGame();
