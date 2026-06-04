interface DallahLogoProps {
  className?: string;
  size?: number;
}

export function DallahLogo({ className = "", size = 32 }: DallahLogoProps) {
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-white overflow-hidden shadow-md ${className}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      <img
        src="/logo.png"
        alt="Dallah Digital"
        style={{ width: size * 0.72, height: size * 0.72, objectFit: "contain" }}
      />
    </div>
  );
}
