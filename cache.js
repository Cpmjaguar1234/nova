// Support the creator of this code at youtube... Channel Name: Michael Yoon

var req = new XMLHttpRequest();
var answers;
var selectedOption;
var options;

req.open("GET", "https://api.jsonbin.io/v3/b/688fd529f7e7a370d1f3153f/latest", true);
req.setRequestHeader("X-Master-Key", "$2a$10$M7CELQabS/Mrpjy.3OERx.If3DUZweYHUR.boUa52D7ro/yM1FQK6");
req.send();

var checkSelectedLabel = () => {
  var selectedLabel;
  document.getElementsByClassName("css-184cpw8")[0].childNodes.forEach((child) => {
    if (child.ariaChecked == "true"){
      if (child.childNodes[0].childNodes[0].innerHTML){
        selectedLabel = child.childNodes[0].childNodes[0].innerHTML
      }
    }
  })
  if (selectedLabel){
    return selectedLabel
  }
  return "None"
}


var updateBin = (val) => {
    console.log("saving...")
    console.log(val)
    var put = new XMLHttpRequest();
    
    put.open("PUT", "https://api.jsonbin.io/v3/b/688fd529f7e7a370d1f3153f", true);
    put.setRequestHeader("Content-Type", "application/json");
    put.setRequestHeader("X-Master-Key", "$2a$10$M7CELQabS/Mrpjy.3OERx.If3DUZweYHUR.boUa52D7ro/yM1FQK6");
    
    
    put.send(JSON.stringify(val));
}

var saveAnswer = () => {
  var title = document.getElementById("lessonTitle").textContent;
  var questionElem = document.querySelector("p.activity-question-header");
  var questionNum = questionElem ? questionElem.childNodes[1].textContent.trim() : null;
  
  console.log(title)
  console.log(questionNum)
  
  var hasAlreadyHomework = false;
  var foundQuestion = false;
  
  answers["record"]["Homeworks"].forEach((homeworkAnswer) => {
    

    
    if (homeworkAnswer["title"] == title){
        
        // ovverwriting answer
        homeworkAnswer["questions"].forEach((homeworkQuestion) => {
          if (homeworkQuestion["questionNum"] == questionNum && !foundQuestion){
            homeworkQuestion["answers"] = homeworkQuestion["answers"].filter(value => options.includes(value));
            foundQuestion = true;
          }
        })
          
        // creating new answer
        if (!foundQuestion){
          homeworkAnswer["questions"].push({"questionNum": questionNum, "answers": options})
          hasAlreadyHomework = true
        }

    }
  })
  
  if (!hasAlreadyHomework && !foundQuestion){
    var updatedAnswer = {}
    updatedAnswer["title"] = title
    updatedAnswer["questions"] = []
    updatedAnswer["questions"].push({"questionNum": questionNum, "answers": options})

    answers["record"] = {"Homeworks": [...answers["record"]["Homeworks"], updatedAnswer]}
  }
}

var addObserver = (selectedOption) => {
    
  
    var targetNode = document.getElementsByClassName("css-1qw96cp")[0]
    // Select the node that will be observed for mutations
    const config = { attributes: false, childList: true, subtree: true };

    // Callback function to execute when mutations are observed
    const callback = (mutationList, observer) => {
      options = ["A", "B", "C", "D"];
      var lengthOfClass = document.getElementsByClassName("css-1qw96cp")[0].childNodes[0].childNodes[2].classList.length

      if (lengthOfClass === 1 && selectedOption !== "None"){
        result = document.getElementsByClassName("css-1qw96cp")[0].childNodes[0].childNodes[2].childNodes[0].childNodes[0].innerHTML.substring(0,4)
        
        if (result !== "<ths"){
          if (result === "Oops"){
            options.splice(options.indexOf(selectedOption), 1)
            
          } else {
            options = [selectedOption]
            
          }
          
          if (options.length > 0){
            
            console.log(options)
            saveAnswer()
            updateBin(answers["record"])
          }

        }
        
      } else {
        if (checkSelectedLabel() !== "None"){
          selectedOption = checkSelectedLabel()
          console.log(selectedOption)
        }

      }
      
    };

    // Create an observer instance linked to the callback function
    const observer = new MutationObserver(callback);

    // Start observing the target node for configured mutations
    observer.observe(targetNode, config);

}


req.onreadystatechange = () => {

  
  if (req.readyState == XMLHttpRequest.DONE && req.responseText !== undefined && req.status === 200) {
    console.log("ready")

    answers = JSON.parse(req.responseText)
    console.log(answers)
    
    
    var newButton = document.createElement("div")
    newButton.innerHTML = "Remove wrong answers";
    newButton.style.textAlign = "center";
    
    newButton.addEventListener("click", () => {
      var title = document.getElementById("lessonTitle").textContent;
      var questionElem = document.querySelector("p.activity-question-header");
      var questionNum = questionElem ? questionElem.childNodes[1].textContent.trim() : null;
      var foundAnswer = false;
      answers["record"]["Homeworks"].forEach((homeworkAnswers) => {
        if (homeworkAnswers["title"] === title){
          homeworkAnswers["questions"].forEach((homeworkQuestions) => {
            if (homeworkQuestions["questionNum"] === questionNum){
              document.getElementsByClassName("css-184cpw8")[0].childNodes.forEach((optionChild) => {
                if (homeworkQuestions["answers"].indexOf(optionChild.childNodes[0].childNodes[0].innerHTML) === -1){
                  optionChild.style.backgroundColor = "red"
                }
              })
              foundAnswer = true;
            }
          })
        }
      })
      if (!foundAnswer){
        console.log("Sorry but there was no data recorded for this question in our database")
      }
    }, true)
    
    var copyButton = document.getElementsByClassName("css-1d46gf4")[0]
    newButton.classList = copyButton.classList
    copyButton.parentNode.appendChild(newButton)


    
    addObserver()
    
  }
};
