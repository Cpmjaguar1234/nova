import { useEffect, useState, useRef, useContext } from "react";
import { createPortal } from "react-dom";
import SubmitButton from "./SubmitButton";
import renderMathInElement from "../../utils/auto-render";
import StudentSectionsContext from "../../_context/StudentSectionsContext";
import clsx from "clsx";
const dmKAS = (window as any).dmKAS; // TODO: find better way to deal with globals
const MQ = (window as any).MQ;

type CustomAnswerProps = {
  answerForm?: string;
  answerScripts?: any; // TS TODO
  setCustomMsg: (str: string) => void;
  setShowAnswerPreview: React.Dispatch<React.SetStateAction<boolean>>;
  setAnsData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  setAnswer: (answer: object) => void;
  className: string;
  customMqFocus: string | null;
  setCustomMqFocus: React.Dispatch<React.SetStateAction<string | null>>;
  problem: any;
};

export default function CustomAnswer({
  answerForm,
  answerScripts,
  setCustomMsg,
  setShowAnswerPreview,
  setAnsData,
  setAnswer,
  className,
  customMqFocus,
  setCustomMqFocus,
  problem,
}: CustomAnswerProps): JSX.Element {
  const [submitContainer, setSubmitContainer] = useState<any>(null); // TS TODO
  const [ansFuncs, setAnsFuncs] = useState<any>(null); // TS TODO
  const { isMfeLoaded } = useContext(StudentSectionsContext);
  const containerRef = useRef<HTMLDivElement>(null);

  /* Submit Button Event Handler */
  const handleSubmit = () => {
    const stuAnswersForPreview = generateAnswers(containerRef, false);
    const stuAnswersForCheck = generateAnswers(containerRef, true);

    const skillsToCheckAnswerData = [
      "graphParabolaOnly",
      "_kphillips__162drawingAngles",
      "rotateRadianEvaluateFunc",
      "slopeGraphically",
    ];
    const includeLogging = skillsToCheckAnswerData.includes(problem?.skillcode);
    if (ansFuncs) {
      const customAnsPreview = ansFuncs.previewAnswer(stuAnswersForPreview);
      if (ansFuncs.packageAnswer !== undefined) {
        const packagedAnswer = ansFuncs.packageAnswer(stuAnswersForPreview);
        setAnsData({});
        setAnswer(packagedAnswer);
      } else if (customAnsPreview !== false && customAnsPreview !== undefined) {
        const customCheckAnsResult = ansFuncs.checkAnswer(stuAnswersForCheck);
        const processedAnswer = processAnswer(customCheckAnsResult);
        if (includeLogging) {
          console.log(
            "answerData in handle submit, submit pressed:",
            problem?.data?.data?.answerData
          );
        }
        setAnsData(processedAnswer);
        setAnswer(stuAnswersForCheck);
      }
      if (customAnsPreview !== false && customAnsPreview !== undefined) {
        setCustomMsg(customAnsPreview);
        setShowAnswerPreview(true);
      }
    }
    if (includeLogging) {
      console.log(
        "psuedoId in handle submit, submit pressed:",
        problem?.data?.data?.psuedoId
      );
    }
  };

  /* Hook to Run Answer Scripts (after all MQ Elements and common btns are generated) */
  useRenderExternalAnswer({
    answerScripts,
    submitContainer,
    setSubmitContainer,
    ansFuncs,
    setAnsFuncs,
    containerRef,
    isMfeLoaded,
    setCustomMqFocus,
    problem,
  });

  /* Hook to Add Event Listeners to All Inputs */
  useEventListenerHandler({
    isMfeLoaded,
    ansFuncs,
    containerRef,
    handleSubmit,
  });

  return (
    <>
      <div className={clsx("answerArea display-problem", className)}>
        {answerForm ? (
          <div id="innerAnswerForm" ref={containerRef}>
            <div
              className="row"
              dangerouslySetInnerHTML={{ __html: answerForm }}
            ></div>
          </div>
        ) : null}
        {submitContainer !== null &&
          createPortal(
            <SubmitButton handleSubmit={handleSubmit} />,
            submitContainer
          )}
      </div>
    </>
  );
}

/* ************ */
/* Custom Hooks */
/* ************ */

/* Custom Hook to Invoke External Script / Find Parent DOM Element of "submit-button" Tag */
function useRenderExternalAnswer({
  answerScripts,
  submitContainer,
  setSubmitContainer,
  ansFuncs,
  setAnsFuncs,
  containerRef,
  isMfeLoaded,
  setCustomMqFocus,
  problem,
}: {
  answerScripts: any;
  submitContainer: any;
  setSubmitContainer: React.Dispatch<any>;
  ansFuncs: any;
  setAnsFuncs: React.Dispatch<any>;
  containerRef: React.RefObject<HTMLDivElement> | null;
  isMfeLoaded: boolean;
  setCustomMqFocus: React.Dispatch<React.SetStateAction<string | null>>;
  problem: any;
}) {
  useEffect(() => {
    const ansFormEl = containerRef?.current;
    const skillsToCheckAnswerData = [
      "graphParabolaOnly",
      "_kphillips__162drawingAngles",
      "rotateRadianEvaluateFunc",
      "slopeGraphically",
    ];
    /* Invoke answer scripts and render katex in the inner answer form */
    if (isMfeLoaded && ansFormEl) {
      if (answerScripts) {
        const answerScriptFunctions = answerScripts(ansFormEl);
        if (skillsToCheckAnswerData.includes(problem?.skillcode)) {
          console.log("answerScripts ran in useRenderExternalAnswer");
        }
        setAnsFuncs(answerScriptFunctions);
      }
      renderMathInElement(ansFormEl);
      /* After running answer scripts, set focus to be the first mathquill box */
      const mqElements = document.querySelectorAll(".mathquill-editable");
      if (mqElements.length) {
        setCustomMqFocus(mqElements[0].id);
      } else {
        setCustomMqFocus(null);
      }
    }
    /* Find container of the submit-button tag, set in state */
    if (submitContainer === null) {
      const submitTagEls = ansFormEl
        ? ansFormEl.getElementsByTagName("submit-button")
        : null;
      if (submitTagEls && submitTagEls.length) {
        const btn = submitTagEls.item(0); // there should only be one submit button in the innerAnswerForm
        if (btn) {
          const parent = document.createElement("span");
          btn.after(parent);
          btn.remove();
          setSubmitContainer(parent);
        }
      }
    }
  }, [answerScripts, isMfeLoaded]);
}

/* Custom Hook to Add an Event Listener to MathQuill / Input Elements */
function useEventListenerHandler({
  isMfeLoaded,
  ansFuncs,
  containerRef,
  handleSubmit,
}: {
  isMfeLoaded: boolean;
  ansFuncs: any;
  containerRef: React.RefObject<HTMLDivElement> | null;
  handleSubmit: () => void;
}) {
  useEffect(() => {
    let inputEls: NodeListOf<HTMLInputElement> | undefined;
    let keyEventListener: (e: KeyboardEvent) => void;

    if (ansFuncs && isMfeLoaded) {
      const ansFormEl = containerRef?.current;

      /* Assign an event listener for input boxes */
      inputEls = ansFormEl?.querySelectorAll("input");
      keyEventListener = (e: KeyboardEvent) => {
        if (e.code === "Enter") handleSubmit();
      };
      inputEls?.forEach((inputEl) => {
        inputEl.addEventListener("keyup", keyEventListener);
      });

      /* Assign an event handler for MathQuill boxes */
      const mqEls = ansFormEl?.querySelectorAll(".mathquill-editable");
      mqEls?.forEach((el: any) => {
        const mq = MQ(el);
        const currentFuncs = mq?.__options?.handlers?.fns || {};
        /* Combine current functions with an enter handler for submission */
        mq?.config({
          handlers: {
            ...currentFuncs,
            enter: (mq: any) => {
              if (currentFuncs.enter) currentFuncs.enter(mq);
              handleSubmit();
            },
          },
        });
      });
    }

    return () => {
      inputEls?.forEach((inputEl) => {
        inputEl.removeEventListener("keyup", keyEventListener);
      });
    };
  }, [isMfeLoaded, ansFuncs]);
}

/* **************** */
/* Helper Functions */
/* **************** */

/* Generates and returns an object with the ids of all answer form elements as keys, and the corresponding values (if applicable) as values */
const generateAnswers = (
  ref: React.RefObject<HTMLDivElement> | null,
  cleanUpAnswer: boolean
) => {
  const ansObj: any = {}; // TS TODO
  const ansFormEl = ref?.current;
  if (ansFormEl) {
    const elList = ansFormEl.querySelectorAll("[id]");
    elList.forEach((node) => {
      let value = "";
      if (node.classList.contains("mathquill-editable")) {
        const mq = MQ(node);
        if (mq) {
          value = mq
            .latex()
            .replace(/−/g, "-")
            .replace(/[^\x00-\x7F]/g, ""); // eslint-disable-line no-control-regex

          /* Apply clean up latex method to custom MathQuill inputs */
          if (cleanUpAnswer) {
            // Update value to be the sanitized value
            value = dmKAS.cleanUpLatex(value);
          }
        }
      } else if (node.tagName === "INPUT") {
        const inputNode = node as HTMLInputElement;
        value = inputNode.value.replace(/−/g, "-");
      } else {
        const possValue = node.attributes.getNamedItem("value")?.value;
        if (possValue !== undefined) value = possValue;
        else {
          const testNode = node as any; // TS TODO
          if (testNode.value !== undefined) value = testNode.value;
        }
      }
      ansObj[node.id] = value;
    });
  }
  return ansObj;
};

/* Processes the answer object returned by checkAnswer to the metaData obj required for checkAnswer endpoint */
const processAnswer = (
  answer:
    | number
    | boolean
    | { correct: boolean; messages?: string[]; message?: string }
    | { equal: boolean; messages?: string[]; message?: string }
) => {
  const processedAnswer: { correct?: number; messages?: string[] } = {};
  if (typeof answer === "boolean") {
    processedAnswer.correct = answer ? 1 : 0;
  } else if (typeof answer === "number") {
    processedAnswer.correct = answer;
  } else {
    if ("equal" in answer) {
      processedAnswer.correct = answer.equal ? 1 : 0;
    } else {
      processedAnswer.correct = answer.correct ? 1 : 0;
    }
    let messages: string[] = [];
    if (answer.message !== undefined) messages.push(answer.message);
    else if (answer.messages !== undefined)
      messages = messages.concat(answer.messages);
    processedAnswer.messages = messages;
  }
  return processedAnswer;
};
