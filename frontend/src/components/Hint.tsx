/** Маленькая подсказка «?» — открывается при наведении и при фокусе (в т.ч. с клавиатуры и на телефоне). */
export default function Hint({ text }: { text: string }) {
  return <span className="hint" tabIndex={0} role="note" aria-label={text} data-tip={text}>?</span>;
}
