import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function FloatingLabelInput({
  label = 'Email',
  type = 'text',
  value = '',
  onChange,
  corner = 26,
  required = false,
  autoComplete = 'off',
  id: customId
}) {
  const isPassword = type === 'password';
  const autoId = useRef(`lbi-${Math.random().toString(36).substring(2, 9)}`).current;
  const inputId = customId || autoId;

  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [flipCount, setFlipCount] = useState(0);
  const [labelWidth, setLabelWidth] = useState(50);
  const [boxWidth, setBoxWidth] = useState(320);

  const boxRef = useRef(null);
  const labelRef = useRef(null);
  const inputRef = useRef(null);

  // Medir ancho de la etiqueta
  useLayoutEffect(() => {
    if (labelRef.current) {
      setLabelWidth(labelRef.current.offsetWidth);
    }
  }, [label]);

  // Medir ancho del contenedor para SVG responsivo
  useLayoutEffect(() => {
    const updateWidth = () => {
      if (boxRef.current) {
        setBoxWidth(boxRef.current.offsetWidth || 320);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const height = 52;
  const width = boxWidth;
  const isUp = isFocused || (value && value.length > 0);

  // Parámetros de la curva bencho.dev (corner = 26px)
  const oC = 0.75;
  const aC = 0.78;
  const r = Math.min(corner, height / 2, width / 2);
  const S = Math.max(14, r + 4);
  const C = Math.max(r * 0.6, S - 5);
  const w = S + labelWidth * aC + 5;
  const T = Math.max(0, r - oC);
  const E = width - oC;
  const D = height - oC;
  const O = width / 2;
  const k = (C + w) / 2;

  // Paths para la línea SVG con hueco dinámico
  const pathGapLeft = `M${k},${oC} L${C},${oC}`;
  const pathGapRight = `M${k},${oC} L${w},${oC}`;
  const pathRightBorder = r > 0
    ? `M${w},${oC} L${width - r},${oC} A${T},${T} 0 0 1 ${E},${r} L${E},${height - r} A${T},${T} 0 0 1 ${width - r},${D} L${O},${D}`
    : `M${w},${oC} L${E},${oC} L${E},${D} L${O},${D}`;
  const pathLeftBorder = r > 0
    ? `M${C},${oC} L${r},${oC} A${T},${T} 0 0 0 ${oC},${r} L${oC},${height - r} A${T},${T} 0 0 0 ${r},${D} L${O},${D}`
    : `M${C},${oC} L${oC},${oC} L${oC},${D} L${O},${D}`;

  const togglePassword = () => {
    setShowPassword(prev => !prev);
    setFlipCount(prev => prev + 1);
  };

  return (
    <div
      className="lbi relative w-full pt-2.5 flex items-center justify-center font-sans"
      data-up={isUp}
      data-focus={isFocused}
      data-filled={value.length > 0}
    >
      <div
        ref={boxRef}
        className="lbi-box relative w-full cursor-text"
        style={{
          height: `${height}px`,
          borderRadius: `${r}px`,
          '--lbi-x': `${S}px`
        }}
      >
        {/* Anillo de borde SVG dinámico */}
        <svg
          className="lbi-ring pointer-events-none absolute inset-0 overflow-visible w-full h-full"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          aria-hidden="true"
        >
          <path d={pathRightBorder} />
          <path d={pathLeftBorder} />
          <path className="lbi-gap" d={pathGapLeft} pathLength={1} />
          <path className="lbi-gap" d={pathGapRight} pathLength={1} />
        </svg>

        {/* Etiqueta flotante con animación letra por letra (hop) */}
        <label
          ref={labelRef}
          htmlFor={inputId}
          className="lbi-label select-none pointer-events-none"
        >
          {[...label].map((char, idx) => (
            <span key={idx} style={{ '--i': idx }}>
              {char}
            </span>
          ))}
        </label>

        {/* Campo de texto nativo */}
        <input
          ref={inputRef}
          id={inputId}
          type={isPassword && !showPassword ? 'password' : isPassword ? 'text' : type}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          required={required}
          autoComplete={autoComplete}
          spellCheck={false}
          data-flip={flipCount % 2}
          className="lbi-field"
          style={{
            paddingLeft: `${S}px`,
            paddingRight: isPassword ? '48px' : `${S}px`
          }}
        />

        {/* Botón para mostrar/ocultar contraseña */}
        {isPassword && (
          <button
            type="button"
            className="lbi-eye"
            data-show={showPassword}
            onPointerDown={(e) => e.preventDefault()}
            onClick={togglePassword}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
          >
            <Eye className="w-4 h-4 eye-open" />
            <EyeOff className="w-4 h-4 eye-close" />
          </button>
        )}
      </div>
    </div>
  );
}
