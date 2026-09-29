"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

type FlashcardItem = {
  word: string;
  ipa: string;
  pos: string;
  theme: string;
  en: string;
  vi: string;
};

type GrammarItem = {
  word: string;
  en: string;
  vi: string;
  analysis: string;
};

type WordFamilyRow = {
  root: string;
  noun: string;
  verb: string;
  adjective: string;
  adverb: string;
};

type DictationDiffToken = {
  text: string;
  kind: "correct" | "incorrect" | "missing";
};

type DictationClip = {
  audioSrc: string;
  transcript: string;
};

type ReadingParagraph = {
  text: string;
  highlightedWords: string[];
};

function normalizeDictation(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w'\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function compareDictation(studentText: string, transcript: string) {
  const studentWords = normalizeDictation(studentText).split(" ").filter(Boolean);
  const targetWords = normalizeDictation(transcript).split(" ").filter(Boolean);
  const matrix = Array.from(
    { length: targetWords.length + 1 },
    () => Array<number>(studentWords.length + 1).fill(0)
  );

  for (let targetIndex = 1; targetIndex <= targetWords.length; targetIndex += 1) {
    for (let studentIndex = 1; studentIndex <= studentWords.length; studentIndex += 1) {
      matrix[targetIndex][studentIndex] = targetWords[targetIndex - 1] === studentWords[studentIndex - 1]
        ? matrix[targetIndex - 1][studentIndex - 1] + 1
        : Math.max(matrix[targetIndex - 1][studentIndex], matrix[targetIndex][studentIndex - 1]);
    }
  }

  const matchedTargetIndexes = new Set<number>();
  let targetIndex = targetWords.length;
  let studentIndex = studentWords.length;

  while (targetIndex > 0 && studentIndex > 0) {
    if (targetWords[targetIndex - 1] === studentWords[studentIndex - 1]) {
      matchedTargetIndexes.add(targetIndex - 1);
      targetIndex -= 1;
      studentIndex -= 1;
    } else if (matrix[targetIndex - 1][studentIndex] >= matrix[targetIndex][studentIndex - 1]) {
      targetIndex -= 1;
    } else {
      studentIndex -= 1;
    }
  }

  const diff: DictationDiffToken[] = [];

  targetWords.forEach((word, index) => {
    diff.push({
      text: word,
      kind: matchedTargetIndexes.has(index) ? "correct" : "missing",
    });
  });

  const correctWords = matrix[targetWords.length][studentWords.length];
  const accuracy = targetWords.length === 0
    ? 0
    : Math.round((correctWords / targetWords.length) * 100);

  return {
    diff,
    accuracy,
    missingWords: targetWords.filter((_, index) => !matchedTargetIndexes.has(index)),
  };
}

function DictationPractice({
  clips,
  highlightedWords,
}: {
  clips: DictationClip[];
  highlightedWords: string[];
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [clipIndex, setClipIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<ReturnType<typeof compareDictation> | null>(null);
  const currentClip = clips[clipIndex];

  const highlightedWordSet = new Set(highlightedWords.map((word) => normalizeDictation(word)));

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const finishPlayback = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("durationchange", updateDuration);
    audio.addEventListener("ended", finishPlayback);
    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("durationchange", updateDuration);
      audio.removeEventListener("ended", finishPlayback);
    };
  }, [currentClip?.audioSrc]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [currentClip?.audioSrc, speed]);

  useEffect(() => {
    function handleAudioShortcut(event: KeyboardEvent) {
      if (event.ctrlKey && event.code === "Space") {
        event.preventDefault();
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.paused) {
          void audio.play();
          setIsPlaying(true);
        } else {
          audio.pause();
          setIsPlaying(false);
        }
      }
    }

    window.addEventListener("keydown", handleAudioShortcut);
    return () => window.removeEventListener("keydown", handleAudioShortcut);
  }, []);

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }

  function submitAnswer() {
    setResult(compareDictation(answer, currentClip.transcript));
  }

  function skipClip() {
    setAnswer("");
    setResult(compareDictation("", currentClip.transcript));
  }

  function resetPractice() {
    setAnswer("");
    setResult(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setCurrentTime(0);
    setIsPlaying(false);
  }

  function nextClip() {
    setClipIndex((currentIndex) => (currentIndex + 1) % clips.length);
    setAnswer("");
    setResult(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }

  function previousClip() {
    if (clipIndex === 0) return;

    setClipIndex((currentIndex) => currentIndex - 1);
    setAnswer("");
    setResult(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

  return (
    <div className="sg-dictation">
      <audio ref={audioRef} src={currentClip.audioSrc} preload="metadata" />
      <div className="sg-dictation-player">
        <div className="sg-dictation-clip-progress">Audio {clipIndex + 1} of {clips.length}</div>
        <div className="sg-dictation-controls">
          <button type="button" className="sg-dictation-main-btn" onClick={togglePlayback} aria-label={isPlaying ? "Pause audio" : "Play audio"}>
            {isPlaying ? "Pause" : "Play"}
          </button>
          <div className="sg-dictation-speed">
            <select id="dictation-speed" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} aria-label="Playback speed">
              {[0.5, 0.75, 1, 1.25, 1.5].map((value) => (
                <option key={value} value={value}>{value}x</option>
              ))}
            </select>
          </div>
        </div>
        <input className="sg-dictation-progress" type="range" min="0" max={duration || 0} step="0.01" value={Math.min(currentTime, duration || 0)} onChange={(event) => {
          const nextTime = Number(event.target.value);
          if (audioRef.current) audioRef.current.currentTime = nextTime;
          setCurrentTime(nextTime);
        }} style={{ "--sg-progress": `${progress}%` } as CSSProperties} aria-label="Audio timeline" />
        <div className="sg-dictation-time"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
      </div>

      <label className="sg-dictation-label" htmlFor="dictation-answer">Type what you hear</label>
      <textarea id="dictation-answer" className="sg-dictation-input" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Listen carefully, then type the sentence here..." rows={6} disabled={Boolean(result)} />
      <div className="sg-dictation-actions">
        {!result ? (
          <>
            <button type="button" className="sg-dictation-reset" onClick={previousClip} disabled={clipIndex === 0}>Previous</button>
            <button type="button" className="sg-dictation-submit" onClick={submitAnswer} disabled={!answer.trim()}>Check</button>
            <button type="button" className="sg-dictation-reset" onClick={skipClip}>Skip</button>
          </>
        ) : (
          <>
            <button type="button" className="sg-dictation-reset" onClick={previousClip} disabled={clipIndex === 0}>Previous</button>
            <button type="button" className="sg-dictation-submit" onClick={nextClip}>{clipIndex === clips.length - 1 ? "Restart" : "Next"}</button>
            <button type="button" className="sg-dictation-reset" onClick={resetPractice}>Try again</button>
          </>
        )}
        <span className="sg-dictation-hotkey">Press <kbd>Ctrl</kbd> + <kbd>Space</kbd> to play/pause</span>
      </div>

      {result && (
        <div className="sg-dictation-result" aria-live="polite">
          <div className="sg-dictation-score">
            <div className="sg-score-ring" style={{ "--sg-score": `${result.accuracy}%` } as CSSProperties}>
              <strong>{result.accuracy}%</strong>
            </div>
            <div>
              <h3>Match accuracy</h3>
              <p>Correct words are compared with the transcript.</p>
            </div>
          </div>
          <p className="sg-dictation-diff">
            {result.diff.map((token, index) => (
              <span key={`${token.kind}-${index}`} className={`sg-diff-token ${token.kind}`}>
                {highlightedWordSet.has(normalizeDictation(token.text)) ? <strong>{token.text}</strong> : token.text}{index < result.diff.length - 1 ? " " : ""}
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}

function playPronunciation(word: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function Flashcard({
  item,
  grammar,
  flipped,
  onFlip,
}: {
  item: FlashcardItem;
  grammar?: GrammarItem;
  flipped: boolean;
  onFlip: () => void;
}) {
  return (
    <div
      className={`sg-flashcard${flipped ? " flipped" : ""}`}
      role="button"
      tabIndex={0}
      onClick={onFlip}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onFlip();
        }
      }}
    >
      <div className="sg-flashcard-inner">
        <div className="sg-flashcard-face sg-flashcard-front">
          <div>
            <div className="sg-meta-row">
              <span className="sg-pill">{item.pos}</span>
              <span className="sg-pill sg-pill-soft">{item.theme}</span>
            <div className="sg-audio-btn" onClick={(e) => { e.stopPropagation(); playPronunciation(item.word); }}>
              🔊
            </div>
           </div>
            <div className="sg-word">{item.word}</div>
            <div className="sg-definition">{item.ipa}</div>
          </div>
        </div>

        <div className="sg-flashcard-face sg-flashcard-back">
          <div className="sg-flashcard-back-content">
            <div className="sg-label">Definition</div>
            <div className="sg-definition sg-definition-strong">{item.vi}</div>
            <div className="sg-definition">{item.en}</div>
            {grammar && (
              <div className="sg-card-grammar">
                <div className="sg-label">Example</div>
                <div className="sg-definition">&quot;{grammar.en}&quot;</div>
                <div className="sg-definition">&quot;{grammar.vi}&quot;</div>
                <div className="sg-label" style={{ marginTop: 16,}}>Grammar</div>
                <div className="sg-definition" style={{fontStyle: "italic" }}>{grammar.analysis}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudyGuideLesson({
  title,
  intro,
  flashcards,
  grammarItems,
  wordFamilies,
  dictation,
  readingParagraph,
}: {
  title: string;
  intro: string;
  flashcards: FlashcardItem[];
  grammarItems: GrammarItem[];
  wordFamilies: WordFamilyRow[];
  dictation?: {
    clips: DictationClip[];
    highlightedWords: string[];
  };
  readingParagraph?: ReadingParagraph;
}) {
  const [activeTab, setActiveTab] = useState<"flashcards" | "family" | "dictation" | "reading">(
    "flashcards"
  );
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);

  const currentFlashcard = flashcards[flashcardIndex];
  const currentGrammar = currentFlashcard
    ? grammarItems.find((item) => item.word === currentFlashcard.word)
    : undefined;

  function moveFlashcard(direction: 1 | -1) {
    if (flashcards.length === 0) return;

    setFlashcardFlipped(false);
    setFlashcardIndex((currentIndex) =>
      (currentIndex + direction + flashcards.length) % flashcards.length
    );
  }

  useEffect(() => {
    function handleFlashcardKeyboard(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (activeTab !== "flashcards" || isTyping || flashcards.length === 0) {
        return;
      }

      if (event.key === " ") {
        event.preventDefault();
        setFlashcardFlipped((value) => !value);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setFlashcardFlipped(false);
        setFlashcardIndex((currentIndex) =>
          (currentIndex - 1 + flashcards.length) % flashcards.length
        );
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setFlashcardFlipped(false);
        setFlashcardIndex((currentIndex) =>
          (currentIndex + 1) % flashcards.length
        );
      }
    }

    window.addEventListener("keydown", handleFlashcardKeyboard);
    return () => window.removeEventListener("keydown", handleFlashcardKeyboard);
  }, [activeTab, flashcards.length]);

  return (
    <section className="sg-shell">
      <style>{`
        .sg-shell {
          color-scheme: light dark;
          --sg-primary: #2563eb;
          --sg-primary-strong: #1d4ed8;
          --sg-bg: #f8fafc;
          --sg-surface: #ffffff;
          --sg-surface-alt: #eff6ff;
          --sg-border: #dbe4f0;
          --sg-text: #0b1220;
          --sg-muted: #475569;
          --sg-accent: #0ea5e9;
          color: var(--sg-text);
          background:
            radial-gradient(circle at top left, rgba(37, 99, 235, 0.10), transparent 24%),
            radial-gradient(circle at top right, rgba(14, 165, 233, 0.10), transparent 28%),
            var(--sg-bg);
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid rgba(219, 228, 240, 0.95);
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
        }

        @media (prefers-color-scheme: dark) {
          .sg-shell {
            --sg-primary: #60a5fa;
            --sg-primary-strong: #68b0f7;
            --sg-bg: #0f172a;
            --sg-surface: #111827;
            --sg-surface-alt: #0b1220;
            --sg-border: #243043;
            --sg-text: #f1f5f9;
            --sg-muted: #c2d0e0;
            --sg-accent: #38bdf8;
            border-color: rgba(36, 48, 67, 0.95);
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.34);
          }
        }

        .sg-hero {
          padding: 28px 28px 22px;
          border-bottom: 1px solid var(--sg-border);
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(14, 165, 233, 0.06));
        }

        .sg-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(37, 99, 235, 0.10);
          color: var(--sg-primary-strong);
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .sg-hero-badge::before {
          content: "";
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--sg-accent);
          box-shadow: 0 0 0 6px rgba(14, 165, 233, 0.12);
        }

        .sg-hero h1 {
          margin: 14px 0 10px;
          font-size: clamp(1.65rem, 3vw, 2.65rem);
          line-height: 1.12;
          letter-spacing: -0.03em;
        }

        .sg-hero p {
          margin: 0;
          max-width: 72ch;
          color: var(--sg-muted);
          font-size: 1rem;
          line-height: 1.7;
        }

        .sg-section-head p {
          color: var(--sg-muted);
        }

        .sg-definition {
          color: var(--sg-text);
        }

        .sg-grammar-block p {
          color: var(--sg-text);
        }

        .sg-tabs {
          display: flex;
          gap: 10px;
          padding: 18px 28px 0;
          flex-wrap: wrap;
        }

        .sg-tab-btn {
          appearance: none;
          border: 1px solid var(--sg-border);
          background: var(--sg-surface);
          color: var(--sg-muted);
          padding: 13px 18px;
          border-radius: 999px;
          font: inherit;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s, background 0.2s, color 0.2s, border-color 0.2s, box-shadow 0.2s;
        }

        .sg-tab-btn:hover {
          transform: translateY(-1px);
          border-color: rgba(37, 99, 235, 0.22);
          color: var(--sg-primary-strong);
        }

        .sg-tab-btn.active {
          background: linear-gradient(135deg, var(--sg-primary), var(--sg-accent));
          color: #fff;
          border-color: transparent;
          box-shadow: 0 14px 28px rgba(37, 99, 235, 0.22);
        }

        .sg-panel {
          display: none;
          padding: 22px 28px 30px;
          animation: sgFadeIn 0.28s ease;
        }

        .sg-panel.active {
          display: block;
        }

        .sg-section-head {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: end;
          margin-bottom: 18px;
        }

        .sg-section-head h2 {
          margin: 0;
          font-size: 1.4rem;
          letter-spacing: -0.02em;
        }

        .sg-section-head p {
          margin: 0;
          color: var(--sg-muted);
          font-size: 0.95rem;
        }

        .sg-flashcard-stage {
          display: grid;
          grid-template-columns: auto minmax(0, 1300px) auto;
          grid-template-rows: auto auto;
          align-items: center;
          justify-content: center;
          column-gap: 18px;
          row-gap: 18px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .sg-card-progress {
          grid-column: 1 / -1;
          grid-row: 1;
          justify-self: center;
          color: var(--sg-muted);
          font-size: 1.1rem;
          font-weight: 800;
        }

        .sg-card-controls {
          display: contents;
        }

        .sg-flashcard {
          perspective: 1400px;
          grid-column: 2;
          grid-row: 2;
          width: 100%;
          min-height: 450px;
          cursor: pointer;
        }

        .sg-flashcard-inner {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 450px;
          transform-style: preserve-3d;
          transition: transform 0.65s cubic-bezier(0.2, 0.7, 0.2, 1);
        }

        .sg-card-nav {
          appearance: none;
          width: 48px;
          height: 72px;
          border: 1px solid var(--sg-border);
          border-radius: 22px;
          padding: 0;
          background: var(--sg-surface);
          color: var(--sg-primary-strong);
          font-family: system-ui, sans-serif;
          font-size: 2.2rem;
          font-weight: 300;
          line-height: 1;
          cursor: pointer;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
          transition: transform 0.2s, border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }

        .sg-card-nav:hover:not(:disabled) {
          transform: scale(1.06);
          border-color: var(--sg-primary);
          background: var(--sg-surface-alt);
          box-shadow: 0 12px 24px rgba(37, 99, 235, 0.16);
        }

        .sg-card-nav:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .sg-card-nav.previous {
          grid-column: 1;
          grid-row: 2;
        }

        .sg-card-nav.next {
          grid-column: 3;
          grid-row: 2;
        }

        .sg-card-nav svg {
          width: 26px;
          height: 26px;
          display: block;
          margin: auto;
        }

        .sg-flashcard.flipped .sg-flashcard-inner {
          transform: rotateY(180deg);
        }

        .sg-flashcard-face {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          border-radius: 22px;
          padding: 25px;
          border: 1px solid var(--sg-border);
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
        }
                
        .sg-flashcard-front {
          background: linear-gradient(180deg, var(--sg-surface), var(--sg-surface-alt));
        }

        .sg-flashcard-back {
          background: linear-gradient(180deg, var(--sg-surface-alt), var(--sg-surface));
          transform: rotateY(180deg);
        }

        .sg-flashcard-back-content {
          max-height: 100%;
          overflow-y: auto;
          scrollbar-width: thin;
        }

        .sg-card-grammar {
          margin-top: 16px;
          padding-top: 14px;
        }

        .sg-word {
          font-size: 2.8rem;
          font-weight: 1000;
          letter-spacing: 0em;
          color: var(--sg-primary-strong);
          margin-bottom: 8px;
        }

        .sg-meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 14px;
        }

        .sg-pill {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 12px 20px;
          font-size: 1.2rem;
          font-weight: 700;
          background: rgba(37, 99, 235, 0.10);
          color: var(--sg-primary-strong);
        }

        .sg-pill-soft {
          background: rgba(14, 165, 233, 0.10);
          color: #075985;
        }

        @media (prefers-color-scheme: dark) {
          .sg-pill-soft {
            color: #bfdbfe;
          }
        }

        .sg-audio-btn {
          appearance: none;
          border: 1px solid rgba(37, 99, 235, 0.24);
          background: rgba(37, 99, 235, 0.10);
          color: var(--sg-primary-strong);
          border-radius: 999px;
          padding: 12px 20px;
          font-size: 1.2rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s, background 0.2s, border-color 0.2s;
        }

        .sg-audio-btn:hover {
          transform: translateY(-1px);
          border-color: rgba(37, 99, 235, 0.38);
          background: rgba(37, 99, 235, 0.16);
        }

        @media (prefers-color-scheme: dark) {
          .sg-audio-btn {
            border-color: rgba(96, 165, 250, 0.30);
            background: rgba(96, 165, 250, 0.12);
            color: #dbeafe;
          }

          .sg-audio-btn:hover {
            border-color: rgba(96, 165, 250, 0.48);
            background: rgba(96, 165, 250, 0.18);
          }
        }

        .sg-hint {
          margin-top: 12px;
          color: var(--sg-muted);
          font-size: 0.82rem;
        }

        .sg-label {
          display: inline-block;
          margin-bottom: 6px;
          font-size: 1.2rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--sg-primary-strong);
        }

        .sg-definition {
          color: #ffffff;
          line-height: 1.88;
          font-size: 1.2rem;
        }

        .sg-definition-strong {
          font-weight: 700;
          font-size: 1.4rem;
          margin-bottom: 10px;
        }

        .sg-grammar-list {
          display: grid;
          gap: 16px;
        }

        .sg-grammar-item {
          border: 1px solid var(--sg-border);
          border-radius: 16px;
          background: var(--sg-surface);
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.05);
          padding: 18px;
        }

        .sg-grammar-head {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .sg-grammar-index {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, var(--sg-primary), var(--sg-accent));
          color: #fff;
          font-size: 0.85rem;
          font-weight: 800;
          flex: 0 0 auto;
        }

        .sg-grammar-title {
          font-size: 1.02rem;
          font-weight: 800;
          color: var(--sg-primary-strong);
        }

        .sg-grammar-block {
          display: grid;
          gap: 12px;
        }

        .sg-grammar-block p {
          margin: 0;
          line-height: 1.75;
          color: #ffffff;
        }

        .sg-table-wrap {
          overflow-x: auto;
        }

        .sg-word-table {
          width: 100%;
          border-collapse: collapse;
          background: var(--sg-surface);
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid var(--sg-border);
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.05);
        }

        .sg-word-table th,
        .sg-word-table td {
          border-bottom: 1px solid var(--sg-border);
          padding: 14px 12px;
          text-align: left;
          vertical-align: top;
          line-height: 1.55;
          font-size: 0.94rem;
        }

        .sg-word-table th {
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.16), rgba(14, 165, 233, 0.16));
          color: var(--sg-text);
          font-size: 0.84rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .sg-word-table tr:nth-child(even) td {
          background: color-mix(in srgb, var(--sg-surface-alt) 70%, var(--sg-surface));
        }

        .sg-word-table tr:nth-child(odd) td {
          background: var(--sg-surface);
        }

        @media (prefers-color-scheme: dark) {
          .sg-word-table th {
            color: var(--sg-text);
            background: linear-gradient(135deg, rgba(37, 99, 235, 0.24), rgba(14, 165, 233, 0.18));
          }

          .sg-word-table tr:nth-child(even) td {
            background: rgba(15, 23, 42, 0.42);
          }

          .sg-word-table tr:nth-child(odd) td {
            background: rgba(17, 24, 39, 0.92);
          }
        }

        .sg-word-table strong {
          color: var(--sg-primary-strong);
        }

        .sg-empty {
          display: none;
          padding: 26px;
          border: 1px dashed rgba(37, 99, 235, 0.35);
          border-radius: 16px;
          background: var(--sg-surface-alt);
          color: var(--sg-muted);
          text-align: center;
          line-height: 1.7;
        }

        .sg-empty.visible {
          display: block;
        }

        .sg-dictation {
          max-width: 900px;
          margin: 0 auto;
          display: grid;
          gap: 20px;
        }

        .sg-dictation-player {
          padding: 22px;
          border: 1px solid var(--sg-border);
          border-radius: 18px;
          background: var(--sg-surface);
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
        }

        .sg-dictation-clip-progress {
          margin-bottom: 16px;
          color: var(--sg-primary-strong);
          font-size: 0.9rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .sg-dictation-score {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .sg-score-ring {
          width: 88px;
          height: 88px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 50%;
          background: conic-gradient(var(--sg-accent) var(--sg-score), var(--sg-border) 0);
          position: relative;
        }

        .sg-score-ring::before {
          content: "";
          position: absolute;
          inset: 7px;
          border-radius: 50%;
          background: var(--sg-surface);
        }

        .sg-score-ring strong {
          position: relative;
          color: var(--sg-primary-strong);
          font-size: 1.15rem;
        }

        .sg-dictation-score h3 {
          margin: 0 0 4px;
          color: var(--sg-text);
        }

        .sg-dictation-score p {
          margin: 0;
          color: var(--sg-muted);
          font-size: 0.9rem;
        }

        .sg-dictation-controls,
        .sg-dictation-actions,
        .sg-dictation-time {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .sg-dictation-controls {
          margin-bottom: 18px;
        }

        .sg-dictation-main-btn,
        .sg-dictation-submit,
        .sg-dictation-reset,
        .sg-dictation-skip,
        .sg-dictation-speed button {
          appearance: none;
          border: 1px solid var(--sg-border);
          border-radius: 10px;
          padding: 10px 14px;
          background: var(--sg-surface-alt);
          color: var(--sg-text);
          font: inherit;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s, background 0.2s, border-color 0.2s;
        }

        .sg-dictation-main-btn,
        .sg-dictation-submit {
          background: linear-gradient(135deg, var(--sg-primary), var(--sg-accent));
          color: #fff;
          border-color: transparent;
        }

        .sg-dictation-main-btn:hover,
        .sg-dictation-submit:hover:not(:disabled),
        .sg-dictation-reset:hover,
        .sg-dictation-skip:hover,
        .sg-dictation-speed button:hover {
          transform: translateY(-1px);
          border-color: var(--sg-primary);
        }

        .sg-dictation-submit:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .sg-dictation-speed {
          display: flex;
          gap: 5px;
          margin-left: auto;
        }

        .sg-dictation-speed label {
          color: var(--sg-muted);
          font-size: 0.85rem;
          font-weight: 700;
        }

        .sg-dictation-speed select {
          border: 1px solid var(--sg-border);
          border-radius: 9px;
          padding: 8px 28px 8px 10px;
          background: var(--sg-surface-alt);
          color: var(--sg-text);
          font: inherit;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
        }

        .sg-dictation-progress {
          width: 100%;
          height: 8px;
          accent-color: var(--sg-primary);
          cursor: pointer;
        }

        .sg-dictation-time {
          justify-content: space-between;
          margin-top: 8px;
          color: var(--sg-muted);
          font-size: 0.85rem;
          font-variant-numeric: tabular-nums;
        }

        .sg-dictation-label {
          color: var(--sg-text);
          font-size: 1.05rem;
          font-weight: 800;
        }

        .sg-dictation-input {
          width: 100%;
          min-height: 150px;
          resize: vertical;
          border: 1px solid var(--sg-border);
          border-radius: 14px;
          padding: 16px;
          background: var(--sg-surface);
          color: var(--sg-text);
          font: inherit;
          font-size: 1rem;
          line-height: 1.7;
          outline: none;
        }

        .sg-dictation-input:focus {
          border-color: var(--sg-primary);
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
        }

        .sg-dictation-hotkey {
          margin-left: auto;
          color: var(--sg-muted);
          font-size: 0.85rem;
        }

        .sg-dictation-hotkey kbd {
          padding: 3px 6px;
          border: 1px solid var(--sg-border);
          border-bottom-width: 2px;
          border-radius: 5px;
          background: var(--sg-surface-alt);
          font-family: system-ui, sans-serif;
          font-size: 0.78rem;
        }

        .sg-dictation-result {
          display: grid;
          gap: 18px;
          padding: 22px;
          border: 1px solid var(--sg-border);
          border-radius: 18px;
          background: var(--sg-surface);
        }

        .sg-dictation-diff {
          margin: 0;
          padding: 16px;
          border-radius: 12px;
          background: var(--sg-surface-alt);
          color: var(--sg-text);
          font-size: 1.05rem;
          line-height: 2;
        }

        .sg-dictation-missing {
          margin: 0;
          color: #dc2626;
          font-size: 0.95rem;
          line-height: 1.7;
        }

        .sg-diff-token {
          display: inline;
        }

        .sg-diff-token.correct {
          color: inherit;
        }

        .sg-diff-token.incorrect,
        .sg-diff-token.missing {
          color: #ff0000;
        }

        .sg-diff-token.missing {
          text-decoration-style: dashed;
        }

        .sg-reading-card {
          max-width: 900px;
          margin: 0 auto;
          padding: 26px;
          border: 1px solid var(--sg-border);
          border-radius: 18px;
          background: var(--sg-surface);
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
        }

        .sg-reading-text {
          margin: 0;
          color: var(--sg-text);
          font-size: 1.12rem;
          line-height: 2;
        }

        .sg-reading-text strong {
          color: var(--sg-primary-strong);
          font-weight: 800;
        }

        @keyframes sgFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 860px) {
          .sg-hero,
          .sg-tabs,
          .sg-panel {
            padding-left: 18px;
            padding-right: 18px;
          }

          .sg-section-head {
            flex-direction: column;
            align-items: start;
          }
        }

        @media (max-width: 640px) {
          .sg-flashcard {
            min-height: 360px;
          }

          .sg-flashcard-inner {
            min-height: 360px;
          }

          .sg-card-nav {
            width: 40px;
            height: 60px;
            border-radius: 12px;
            font-size: 1.8rem;
          }

          .sg-tab-btn {
            width: 100%;
            justify-content: center;
          }

          .sg-tabs {
            display: grid;
            grid-template-columns: 1fr;
          }

          .sg-dictation-speed,
          .sg-dictation-hotkey {
            margin-left: 0;
          }
        }
      `}</style>

      <header className="sg-hero">
        <span className="sg-hero-badge">Study Guide Series</span>
        <h1>{title}</h1>
        <p>{intro}</p>
      </header>

      <nav className="sg-tabs" aria-label="Lesson sections">
        <button
          className={`sg-tab-btn${activeTab === "flashcards" ? " active" : ""}`}
          type="button"
          onClick={() => setActiveTab("flashcards")}
        >
          Section 1: Flashcards
        </button>
        <button
          className={`sg-tab-btn${activeTab === "family" ? " active" : ""}`}
          type="button"
          onClick={() => setActiveTab("family")}
        >
          Section 2: Word Family Table
        </button>
        {dictation && (
          <button
            className={`sg-tab-btn${activeTab === "dictation" ? " active" : ""}`}
            type="button"
            onClick={() => setActiveTab("dictation")}
          >
            Section 3: Dictation Practice
          </button>
        )}
        {readingParagraph && (
          <button
            className={`sg-tab-btn${activeTab === "reading" ? " active" : ""}`}
            type="button"
            onClick={() => setActiveTab("reading")}
          >
            Section 4: Reading Practice
          </button>
        )}
      </nav>

      <div className={`sg-panel${activeTab === "flashcards" ? " active" : ""}`}>
        <div className="sg-section-head">
          <div>
            <h2>Section 1: Flashcards</h2>
            <p>Each card flips on click and includes a pronunciation button on the front.</p>
          </div>
        </div>

        {currentFlashcard ? (
          <div className="sg-flashcard-stage">
            <div className="sg-card-progress" aria-live="polite">
              Card {flashcardIndex + 1} of {flashcards.length}
            </div>
            <Flashcard
              key={currentFlashcard.word}
              item={currentFlashcard}
              grammar={currentGrammar}
              flipped={flashcardFlipped}
              onFlip={() => setFlashcardFlipped((value) => !value)}
            />
            <div className="sg-card-controls">
              <button
                className="sg-card-nav previous"
                type="button"
                onClick={() => moveFlashcard(-1)}
                disabled={flashcards.length < 2}
                aria-label="Previous flashcard"
                title="Previous flashcard"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                className="sg-card-nav next"
                type="button"
                onClick={() => moveFlashcard(1)}
                disabled={flashcards.length < 2}
                aria-label="Next flashcard"
                title="Next flashcard"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        ) : null}

        <div className={`sg-empty${flashcards.length === 0 ? " visible" : ""}`}>
          No flashcards are available.
        </div>
      </div>

      <div className={`sg-panel${activeTab === "family" ? " active" : ""}`}>
        <div className="sg-section-head">
          <div>
            <h2>Section 2: Word Family Table</h2>
            <p>A full 5-column word family table for quick review of related forms.</p>
          </div>
        </div>

        <div className="sg-table-wrap">
          <table className="sg-word-table">
            <thead>
              <tr>
                <th>Root Word</th>
                <th>Noun Form(s)</th>
                <th>Verb Form(s)</th>
                <th>Adjective Form(s)</th>
                <th>Adverb Form(s)</th>
              </tr>
            </thead>
            <tbody>
              {wordFamilies.map((row) => (
                <tr key={row.root}>
                  <td><strong>{row.root}</strong></td>
                  <td>{row.noun}</td>
                  <td>{row.verb}</td>
                  <td>{row.adjective}</td>
                  <td>{row.adverb}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {dictation && (
        <div className={`sg-panel${activeTab === "dictation" ? " active" : ""}`}>
          <div className="sg-section-head">
            <div>
              <h2>Section 3: Dictation Practice</h2>
              <p>Listen to the sentence, type what you hear, and check your word-level accuracy.</p>
            </div>
          </div>
          <DictationPractice clips={dictation.clips} highlightedWords={dictation.highlightedWords} />
        </div>
      )}
      {readingParagraph && (
        <div className={`sg-panel${activeTab === "reading" ? " active" : ""}`}>
          <div className="sg-section-head">
            <div>
              <h2>Section 4: Reading Practice</h2>
              <p>Read the paragraph and review the vocabulary words in context.</p>
            </div>
          </div>

          <div className="sg-reading-card">
            <p className="sg-reading-text">
              {readingParagraph.text
                .split(
                  new RegExp(
                    `(${readingParagraph.highlightedWords
                      .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
                      .join("|")})`,
                    "gi"
                  )
                )
                .map((part, index) => {
                  const isHighlighted = readingParagraph.highlightedWords.some(
                    (word) => word.toLowerCase() === part.toLowerCase()
                  );

                  return isHighlighted ? (
                    <strong key={index}>{part}</strong>
                  ) : (
                    part
                  );
                })}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}