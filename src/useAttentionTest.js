import { useCallback, useEffect, useRef, useState } from "react";
import { COLORS, GIF_FILES, INDEPENDENT_SOUNDS, SHAPES } from "./constants.js";
import { getGifPosition } from "./shapeUtils.jsx";
import { pickSeeded, pickTargetRandom, resetSeed, seededRandom } from "./random.js";

export function useAttentionTest(profile, { onFinished } = {}) {
  const [target, setTarget] = useState(null);
  const [scene, setScene] = useState(null);
  const [gifs, setGifs] = useState([]);
  const [running, setRunning] = useState(false);

  const targetRef = useRef(null);
  const logRef = useRef([]);
  const trialRef = useRef(null);
  const timerRef = useRef(null);
  const clockRef = useRef(null);
  const eventTimers = useRef([]);
  const lastKey = useRef(0);
  const audioMap = useRef({});
  const playing = useRef(false);
  const t0 = useRef(0);
  const gifIds = useRef([]);
  const soundGifIds = useRef([]);
  const soloSoundId = useRef(null);

  const nextTrialRef = useRef(null);

  const mkTarget = useCallback(() => {
    const prev = targetRef.current;
    let next;
    let g = 0;
    do {
      next = { shape: pickTargetRandom(SHAPES), color: pickTargetRandom(COLORS) };
      g++;
    } while (prev && next.shape === prev.shape && next.color === prev.color && g < 40);
    targetRef.current = next;
    setTarget(next);
  }, []);

  const elapsed = useCallback(() => (t0.current ? performance.now() - t0.current : 0), []);

  const phaseNow = useCallback(
    (ms = elapsed()) => profile.phases.find((p) => ms < p.end) ?? profile.phases.at(-1),
    [profile.phases, elapsed]
  );

  const clearEvents = useCallback(() => {
    eventTimers.current.forEach(clearTimeout);
    eventTimers.current = [];
  }, []);

  const stopAudio = useCallback(() => {
    Object.values(audioMap.current).forEach((a) => {
      if (a) {
        a.pause();
        a.currentTime = 0;
        a.src = "";
      }
    });
    audioMap.current = {};
    soloSoundId.current = null;
    soundGifIds.current = [];
  }, []);

  const stopAll = useCallback(() => {
    clearEvents();
    stopAudio();
    gifIds.current = [];
    soundGifIds.current = [];
    setGifs([]);
  }, [clearEvents, stopAudio]);

  const removeGif = useCallback(
    (id) => {
      const a = audioMap.current[id];
      if (a) {
        a.pause();
        delete audioMap.current[id];
      }
      gifIds.current = gifIds.current.filter((x) => x !== id);
      soundGifIds.current = soundGifIds.current.filter((x) => x !== id);
      setGifs((p) => p.filter((g) => g.id !== id));
    },
    []
  );

  const canAdd = useCallback((items) => {
    const nS = items.filter((i) => !i.silent).length;
    if (!items.length) return false;
    if (gifIds.current.length + items.length > 2) return false;
    if (soundGifIds.current.length + nS > 1) return false;
    if (nS > 1) return false;
    return true;
  }, []);

  const showGif = useCallback(
    (idx) => {
      const ev = profile.gifEvents[idx];
      if (!ev || !playing.current || !canAdd(ev.items)) return;
      const items = ev.items
        .map((raw, i) => {
          const f = GIF_FILES[raw.key];
          if (!f) return null;
          const pos = getGifPosition(raw.area, raw.zone);
          return {
            id: `g-${idx}-${i}-${Date.now()}`,
            gif: f.gif,
            sound: raw.silent ? null : f.sound,
            left: pos.left,
            top: pos.top,
            size: f.size
          };
        })
        .filter(Boolean);
      if (!items.length) return;
      gifIds.current = [...gifIds.current, ...items.map((x) => x.id)];
      soundGifIds.current = [...soundGifIds.current, ...items.filter((x) => x.sound).map((x) => x.id)];
      setGifs((p) => [...p, ...items]);
      items.forEach((it) => {
        if (it.sound) {
          const a = new Audio(it.sound);
          a.loop = true;
          a.volume = 0.65;
          audioMap.current[it.id] = a;
          a.play().catch(() => removeGif(it.id));
        }
        eventTimers.current.push(setTimeout(() => removeGif(it.id), ev.duration));
      });
    },
    [canAdd, profile.gifEvents, removeGif]
  );

  const playSolo = useCallback(
    (idx) => {
      const ev = profile.soundEvents[idx];
      if (!ev || !playing.current || soloSoundId.current) return;
      const path = INDEPENDENT_SOUNDS[ev.key];
      if (!path) return;
      const id = `s-${idx}-${Date.now()}`;
      const a = new Audio(path);
      a.volume = 0.65;
      audioMap.current[id] = a;
      soloSoundId.current = id;
      a.play().catch(() => {
        delete audioMap.current[id];
        soloSoundId.current = null;
      });
      eventTimers.current.push(
        setTimeout(() => {
          a.pause();
          delete audioMap.current[id];
          if (soloSoundId.current === id) soloSoundId.current = null;
        }, ev.duration)
      );
    },
    [profile.soundEvents]
  );

  const scheduleDistractors = useCallback(() => {
    clearEvents();
    profile.gifEvents.forEach((e, i) => eventTimers.current.push(setTimeout(() => showGif(i), e.at)));
    profile.soundEvents.forEach((e, i) => eventTimers.current.push(setTimeout(() => playSolo(i), e.at)));
  }, [clearEvents, profile.gifEvents, profile.soundEvents, playSolo, showGif]);

  const flushTrial = useCallback(() => {
    const t = trialRef.current;
    if (t) {
      logRef.current.push({
        trialNumber: t.trialNumber,
        section: t.section,
        isTarget: t.isTarget,
        shownShape: t.shownShape,
        shownColor: t.shownColor,
        targetShape: t.targetShape,
        targetColor: t.targetColor,
        responded: t.responded,
        reactionTime: t.reactionTime || 0,
        responseCount: t.responses.length
      });
    }
    trialRef.current = null;
  }, []);

  const endTest = useCallback(() => {
    clearTimeout(timerRef.current);
    clearTimeout(clockRef.current);
    flushTrial();
    setScene(null);
    playing.current = false;
    setRunning(false);
    stopAll();
    const snapshot = logRef.current.slice();
    const targetSnap = targetRef.current ? { shape: targetRef.current.shape, color: targetRef.current.color } : null;
    onFinished?.(snapshot, targetSnap);
  }, [flushTrial, onFinished, stopAll]);

  const nonTarget = useCallback(() => {
    const cur = targetRef.current;
    let o;
    do {
      o = { shape: pickSeeded(SHAPES), color: pickSeeded(COLORS) };
    } while (o.shape === cur.shape && o.color === cur.color);
    return o;
  }, []);

  const nextTrial = useCallback(() => {
    if (!playing.current) return;
    const ms = elapsed();
    if (ms >= profile.durationMs) {
      endTest();
      return;
    }
    const ph = phaseNow(ms);
    const n = logRef.current.length + 1;
    const isT = seededRandom() < profile.targetProbability;
    const cur = targetRef.current;
    const shown = isT ? { ...cur } : nonTarget();
    trialRef.current = {
      trialNumber: n,
      section: ph.name,
      isTarget: isT,
      shownShape: shown.shape,
      shownColor: shown.color,
      targetShape: cur.shape,
      targetColor: cur.color,
      responded: false,
      reactionTime: 0,
      responses: [],
      startTime: performance.now()
    };
    setScene({ shape: shown.shape, color: shown.color });
    timerRef.current = setTimeout(() => {
      setScene(null);
      const t = trialRef.current;
      if (t) {
        logRef.current.push({
          trialNumber: t.trialNumber,
          section: t.section,
          isTarget: t.isTarget,
          shownShape: t.shownShape,
          shownColor: t.shownColor,
          targetShape: t.targetShape,
          targetColor: t.targetColor,
          responded: t.responded,
          reactionTime: t.reactionTime || 0,
          responseCount: t.responses.length
        });
      }
      trialRef.current = null;
      timerRef.current = setTimeout(nextTrialRef.current, phaseNow().gap);
    }, ph.stimulus);
  }, [elapsed, endTest, nonTarget, phaseNow, profile.durationMs, profile.targetProbability]);

  nextTrialRef.current = nextTrial;

  const respond = useCallback(() => {
    const t = trialRef.current;
    if (!t) return;
    const now = performance.now();
    t.responses.push(now);
    if (!t.responded) {
      t.responded = true;
      t.reactionTime = now - t.startTime;
    }
  }, []);

  const register = useCallback(() => {
    const now = performance.now();
    if (now - lastKey.current < 120) return;
    lastKey.current = now;
    respond();
  }, [respond]);

  const start = useCallback(() => {
    resetSeed();
    logRef.current = [];
    trialRef.current = null;
    lastKey.current = 0;
    clearTimeout(timerRef.current);
    clearTimeout(clockRef.current);
    stopAll();
    setScene(null);
    t0.current = performance.now();
    playing.current = true;
    setRunning(true);
    scheduleDistractors();
    clockRef.current = setTimeout(endTest, profile.durationMs);
  }, [endTest, profile.durationMs, scheduleDistractors, stopAll]);

  const resetAfterReport = useCallback(() => {
    clearTimeout(timerRef.current);
    clearTimeout(clockRef.current);
    playing.current = false;
    stopAll();
    logRef.current = [];
    trialRef.current = null;
    t0.current = 0;
    setScene(null);
    resetSeed();
    mkTarget();
  }, [mkTarget, stopAll]);

  useEffect(() => {
    mkTarget();
    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(clockRef.current);
      stopAll();
    };
  }, [profile.key, mkTarget, stopAll]);

  useEffect(() => {
    if (!running || !targetRef.current) return undefined;
    nextTrialRef.current();
    return () => clearTimeout(timerRef.current);
  }, [running]);

  useEffect(() => {
    const kd = (e) => {
      const el = document.activeElement;
      const typing =
        el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if (e.code === "Space" && !typing && playing.current) {
        e.preventDefault();
        register();
      }
    };
    window.addEventListener("keydown", kd);
    return () => window.removeEventListener("keydown", kd);
  }, [register]);

  return { target, scene, gifs, running, start, register, resetAfterReport };
}
