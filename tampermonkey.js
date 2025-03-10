class AssessmentHelper{constructor(){this.itemMetadata={questions:LearnosityAssess.getCurrentItem().questions,UI:this.createUI(),answerUI:this.createAnswerUI()},this.processedQuestions=new Map,this.initializeUI()}createUI(){let e=document.createElement("div");return e.innerHTML=`
    <div id="Launcher" class="Launcher" style="outline: none;min-height: 200px;transform: 
    translateX(0px) translateY(-32px);opacity: 0.95;font-family: 'Nunito', sans-serif;width: 200px;height: auto;background: 
    #1c1e2b;position: absolute;border-radius: 16px;display: grid;place-items: center;color: white;font-size: larger;top: 141px;left: 21px; position:absolute; z-index: 99999;padding: 20px;box-shadow: 0 8px 16px rgba(0,0,0,0.3);resize: both;overflow: hidden;">
      <div class="drag-handle" style="width: 100%; height: 20px; cursor: move; background: transparent;"></div>
      <button id="closeButton" style="position: absolute; top: 5px; right: 5px; background: none; border: none; color: white; font-size: 16px; cursor: pointer;">\xd7</button>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="40" height="40" class="center" style="margin-bottom: 10px;">
        <path d="M50,30 H120 C150,30 170,60 140,90 C170,110 170,150 130,170 H50 V30Z" 
              fill="none" 
              stroke="white" 
              stroke-width="6" 
              stroke-linejoin="miter"
              stroke-miterlimit="10"/>
        <path d="M70,50 H110 C130,50 130,70 110,90 H70 V50Z" 
              fill="#34495e" 
              stroke="white" 
              stroke-width="6" 
              stroke-linejoin="miter"
              stroke-miterlimit="10"/>
        <path d="M70,110 H120 C140,110 140,150 120,150 H70 V110Z" 
              fill="#34495e" 
              stroke="white" 
              stroke-width="6" 
              stroke-linejoin="miter"
              stroke-miterlimit="10"/>
      </svg>
      <h1 class="title" style="font-size: 28px; margin: 10px 0;">Nova</h1>
      <h1 class="bottomTitle" style="font-size: 14px; margin: 5px 0;">1.0</h1>
      <button id="answer" class="button" style="font-size: 14px; padding: 10px 20px; background: #2c2f3f; border: none; color: white; border-radius: 8px; cursor: pointer; margin-bottom: 10px;">Get Answer</button>
    </div>
  `,e}createAnswerUI(){let e=document.createElement("div");return e.innerHTML=`
    <div id="AnswerLauncher" class="AnswerLauncher" style="outline: none;min-height: 100px;transform: 
    translateX(0px) translateY(-32px);opacity: 0.95;font-family: 'Nunito', sans-serif;width: 200px;height: auto;background: 
    #1c1e2b;position: absolute;border-radius: 16px;display: grid;place-items: center;color: white;font-size: larger;top: 300px;left: 21px; position:absolute; z-index: 99999;padding: 10px;box-shadow: 0 8px 16px rgba(0,0,0,0.3);resize: both;overflow: hidden;">
      <div class="drag-handle" style="width: 100%; height: 20px; cursor: move; background: transparent;"></div>
      <div id="answerSection" style="color: white; font-size: 14px; background: #2c2f3f; padding: 5px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); width: 100%; overflow: auto; max-height: 100px;"></div>
    </div>
  `,e}initializeUI(){document.body.appendChild(this.itemMetadata.UI),document.body.appendChild(this.itemMetadata.answerUI),this.makeDraggable(this.itemMetadata.UI.firstElementChild),this.makeDraggable(this.itemMetadata.answerUI.firstElementChild),this.makeResizable(this.itemMetadata.UI.firstElementChild),this.setupAnswerButton(),this.setupToggleVisibility();let e=document.getElementById("closeButton");e&&(e.onclick=()=>{document.body.removeChild(this.itemMetadata.UI),document.body.removeChild(this.itemMetadata.answerUI)})}setupToggleVisibility(){document.addEventListener("keydown",e=>{if(e.altKey&&"KeyC"===e.code){let t=document.getElementById("Launcher"),i=document.getElementById("AnswerLauncher"),o="none"===t.style.display?"block":"none";t.style.display=o,i.style.display=o}else e.altKey&&"KeyX"===e.code&&this.getQuestionAnswers()})}makeResizable(e){let t=new ResizeObserver(t=>{for(let i of t){let o=i.contentRect.width,n=i.contentRect.height;o<200&&(e.style.width="200px"),n<200&&(e.style.height="200px");let l=Math.min(o/200,n/200,2),s=e.querySelector(".title"),a=e.querySelector(".bottomTitle"),r=e.querySelector(".button"),d=e.querySelector("#answerSection"),p=e.querySelector("svg");s&&(s.style.fontSize=28*l+"px"),a&&(a.style.fontSize=14*l+"px"),r&&(r.style.width=Math.min(o-40,360)+"px",r.style.fontSize=14*l+"px",r.style.padding=10*l+"px "+20*l+"px"),d&&(d.style.width=r.style.width,d.style.fontSize=14*l+"px",d.style.maxHeight=n-200+"px"),p&&(p.style.width=40*l+"px",p.style.height=40*l+"px")}});t.observe(e)}setupAnswerButton(){let e=document.querySelectorAll(".button");e.forEach(e=>{e.onclick=()=>this.getQuestionAnswers()})}getQuestionAnswers(){let e=LearnosityAssess.getCurrentItem().questions,t=document.getElementById("answerSection");t.innerHTML="";for(let i=0;i<e.length;i++){let o=e[i],n=o.type,l=[];if("clozeassociation"===n){let s=o.validation.valid_response;for(let a=0;a<s.value.length;a++)l.push(s.value[a].toString())}else if("clozeformula"===n){let r=o.validation.valid_response;for(let d=0;d<r.value.length;d++)l.push(r.value[d][0].value.toString())}else if("longtypeV2"===n||"longtextV2"===n)l.push("Can't be done, use Google or something.");else if("mcq"===n){let p=o.validation.valid_response;for(let $=0;$<p.value.length;$++){let h=p.value[$];l.push(h.toString())}}else if("clozedropdown"===n){let u=o.validation.valid_response;for(let c=0;c<u.value.length;c++)l.push(u.value[c].toString())}else if("graphplotting"===n){let g=o.validation.valid_response;for(let m=0;m<g.value.length;m++)if("point"===g.value[m].type){let v=JSON.stringify(g.value[m].coords);l.push(v)}}t.innerHTML+=`<p>${l.join(", ")}</p>`}}getAnswerHandler(e){return({clozeassociation:e=>this.handleClozeAssociation(e),clozeformula:e=>this.handleClozeFormula(e),longtypeV2:()=>this.handleLongText(),longtextV2:()=>this.handleLongText(),mcq:e=>this.handleMCQ(e),clozedropdown:e=>this.handleClozeDropdown(e),graphplotting:e=>this.handleGraphPlotting(e)})[e]}handleClozeAssociation(e){return e.validation.valid_response.value[0]}handleClozeFormula(e){return e.validation.valid_response.value[0][0].value}handleLongText(){return null}handleMCQ(e){let t={0:"A",1:"B",2:"C",3:"D",4:"E",5:"F",6:"G",7:"H",8:"I",9:"J"},i=e.validation.valid_response.value,o=i.map(e=>t[e]);return o.join(", ")}handleClozeDropdown(e){return e.validation.valid_response.value[0]}handleGraphPlotting(e){let t=e.validation.valid_response.value[0];return"point"===t.type?JSON.stringify(t.coords):null}makeDraggable(e){let t=0,i=0,o=0,n=0,l=e=>{(e=e||window.event).preventDefault(),o=e.clientX,n=e.clientY,document.onmouseup=a,document.onmousemove=s},s=l=>{(l=l||window.event).preventDefault(),t=o-l.clientX,i=n-l.clientY,o=l.clientX,n=l.clientY,e.style.top=e.offsetTop-i+"px",e.style.left=e.offsetLeft-t+"px"},a=()=>{document.onmouseup=null,document.onmousemove=null},r=e.querySelector(".drag-handle");r&&(r.onmousedown=l)}}const assessmentHelper=new AssessmentHelper;