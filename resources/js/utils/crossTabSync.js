export function broadcastChange(eventName, detail = null) {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
  try {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(eventName);
    channel.postMessage(detail);
    channel.close();
  } catch {
    // BroadcastChannel unsupported/unavailable — same-tab CustomEvent above still fires.
  }
}

export function subscribeToChange(eventName, handler) {
  const onLocal = (event) => handler(event.detail);
  window.addEventListener(eventName, onLocal);

  let channel;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(eventName);
      // Re-dispatch locally so there's exactly one code path (the CustomEvent
      // listener above) that reacts to a change, whether it originated in this
      // tab or another one.
      channel.onmessage = (event) => window.dispatchEvent(new CustomEvent(eventName, { detail: event.data }));
    }
  } catch {
    channel = undefined;
  }

  return () => {
    window.removeEventListener(eventName, onLocal);
    channel?.close();
  };
}
