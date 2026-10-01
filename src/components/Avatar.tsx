import { avatarColor, initials } from '../lib/format';

interface Props {
  title: string;
  seed: string;
  size?: number;
}

export function Avatar({ title, seed, size = 48 }: Props) {
  return (
    <div
      className="avatar"
      style={{ background: avatarColor(seed), width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials(title)}
    </div>
  );
}
