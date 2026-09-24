/**
 * Fullscreen and Mobile Screen Orientation Utilities for Mobile-to-TV Screen Mirroring
 */

export function isFullscreenActive(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as any;
  return !!(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
}

export async function requestAppFullscreen(elem: HTMLElement = document.documentElement): Promise<boolean> {
  const el = elem as any;
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen({ navigationUI: 'hide' });
      return true;
    } else if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
      return true;
    } else if (el.mozRequestFullScreen) {
      await el.mozRequestFullScreen();
      return true;
    } else if (el.msRequestFullscreen) {
      await el.msRequestFullscreen();
      return true;
    }
  } catch (err) {
    console.warn('Fullscreen request failed or was not allowed:', err);
  }
  return false;
}

export async function exitAppFullscreen(): Promise<boolean> {
  const doc = document as any;
  try {
    if (doc.exitFullscreen) {
      await doc.exitFullscreen();
      return true;
    } else if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
      return true;
    } else if (doc.mozCancelFullScreen) {
      await doc.mozCancelFullScreen();
      return true;
    } else if (doc.msExitFullscreen) {
      await doc.msExitFullscreen();
      return true;
    }
  } catch (err) {
    console.warn('Exit fullscreen failed:', err);
  }
  return false;
}

export async function lockLandscapeOrientation(): Promise<boolean> {
  if (typeof screen === 'undefined') return false;
  const scr = screen as any;
  try {
    if (scr.orientation && typeof scr.orientation.lock === 'function') {
      await scr.orientation.lock('landscape');
      return true;
    } else if (typeof scr.lockOrientation === 'function') {
      return scr.lockOrientation('landscape');
    } else if (typeof scr.mozLockOrientation === 'function') {
      return scr.mozLockOrientation('landscape');
    } else if (typeof scr.msLockOrientation === 'function') {
      return scr.msLockOrientation('landscape');
    }
  } catch (err) {
    // Screen orientation locking requires fullscreen or user gestures, and is not supported in all browsers (e.g. desktop, iOS Safari)
    console.info('Landscape orientation lock not supported or permitted on this device/browser:', err);
  }
  return false;
}

export function unlockScreenOrientation(): void {
  if (typeof screen === 'undefined') return;
  const scr = screen as any;
  try {
    if (scr.orientation && typeof scr.orientation.unlock === 'function') {
      scr.orientation.unlock();
    } else if (typeof scr.unlockOrientation === 'function') {
      scr.unlockOrientation();
    }
  } catch {
    // Ignore unlock errors
  }
}

export async function toggleFullscreenAndOrientation(): Promise<boolean> {
  if (isFullscreenActive()) {
    unlockScreenOrientation();
    await exitAppFullscreen();
    return false;
  } else {
    await requestAppFullscreen();
    await lockLandscapeOrientation();
    return true;
  }
}
