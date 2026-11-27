// play() w starszych przeglądarkach (np. w telewizorach) potrafi zwrócić
// undefined zamiast Promise albo rzucić wyjątkiem — zawsze zwracamy Promise.
export function safePlay(v) {
  try {
    const p = v.play()
    return p && typeof p.then === 'function' ? p : Promise.resolve()
  } catch (e) {
    return Promise.reject(e)
  }
}
