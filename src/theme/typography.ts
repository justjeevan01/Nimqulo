// React Native applies the system font-size preference itself. Typography uses
// logical units, independently of the reference artwork's screen-width scale.
export function textSize(referenceSize: number) {
  return Math.min(referenceSize, referenceSize <= 20 ? 16 : referenceSize <= 40 ? 24 : 32);
}

export function textLineHeight(referenceHeight: number) {
  return Math.min(referenceHeight, referenceHeight > 48 ? 40 : 32);
}
