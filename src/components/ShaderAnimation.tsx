import { useEffect, useRef, type CSSProperties } from 'react';

/**
 * Animated "light ripple" background: glowing concentric arcs of light,
 * dispersed into color and sliced by a diagonal grid.
 *
 * The whole effect is the fragment shader below, drawn onto a single
 * full-screen quad. The upstream skill builds this on Three.js; a quad with no
 * camera, scene graph, or geometry pipeline needs none of it, so this runs on
 * raw WebGL instead and keeps the demo bundle dependency-free. The shader
 * source is unchanged, so the visual matches.
 */
export type ShaderAnimationProps = {
  /** Animation speed multiplier (1 = default). 0 renders a still frame. */
  speed?: number;
  /** Glow line thickness (default 0.002); higher reads bolder. */
  lineWidth?: number;
  /** How many concentric ripples fit across the screen (default 5). */
  frequency?: number;
  /** Chromatic separation for the full-spectrum look. Ignored when `tint` is set. */
  dispersion?: number;
  /** Monochrome tint as [r,g,b] in 0–1. Omit for the full-spectrum default. */
  tint?: readonly [number, number, number] | null;
  /** Overall brightness multiplier (default 1). */
  brightness?: number;
  className?: string;
  style?: CSSProperties;
};

const VERTEX_SHADER = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const FRAGMENT_SHADER = `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform float uLineWidth;
uniform float uFrequency;
uniform float uDispersion;
uniform vec3 uTint;
uniform float uUseTint;
uniform float uBrightness;

void main(void) {
  vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
  float t = time * 0.05;
  vec3 color = vec3(0.0);
  for (int j = 0; j < 3; j++) {
    for (int i = 0; i < 5; i++) {
      color[j] += uLineWidth * float(i * i) /
        abs(fract(t - uDispersion * float(j) + float(i) * 0.01) * uFrequency
            - length(uv) + mod(uv.x + uv.y, 0.2));
    }
  }
  float mono = (color.r + color.g + color.b) / 3.0;
  vec3 finalColor = mix(color, mono * uTint, uUseTint);
  gl_FragColor = vec4(finalColor * uBrightness, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function ShaderAnimation({
  speed = 1,
  lineWidth = 0.002,
  frequency = 5,
  dispersion = 0.01,
  tint = null,
  brightness = 1,
  className,
  style,
}: ShaderAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Read as an array so the effect below doesn't re-run on every render just
  // because a tuple literal was passed inline.
  const tintKey = tint ? tint.join(',') : '';

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
    if (!gl) return;

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // Two triangles covering clip space — the shader does the rest.
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const resolutionLocation = gl.getUniformLocation(program, 'resolution');
    const timeLocation = gl.getUniformLocation(program, 'time');
    gl.uniform1f(gl.getUniformLocation(program, 'uLineWidth'), lineWidth);
    gl.uniform1f(gl.getUniformLocation(program, 'uFrequency'), frequency);
    gl.uniform1f(gl.getUniformLocation(program, 'uDispersion'), dispersion);
    gl.uniform3fv(gl.getUniformLocation(program, 'uTint'), new Float32Array(tint ?? [1, 1, 1]));
    gl.uniform1f(gl.getUniformLocation(program, 'uUseTint'), tint ? 1 : 0);
    gl.uniform1f(gl.getUniformLocation(program, 'uBrightness'), brightness);

    container.appendChild(canvas);

    let time = 1;
    const render = () => {
      gl.uniform1f(timeLocation, time);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const resize = () => {
      // Cap the pixel ratio: this is a full-screen fragment shader, and phones
      // with ratio 3 would shade ~9x the pixels for no visible gain.
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(Math.round(container.clientWidth * ratio), 1);
      const height = Math.max(Math.round(container.clientHeight * ratio), 1);
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      gl.uniform2f(resolutionLocation, width, height);
      render();
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(container);

    // Honour reduced-motion by holding a still frame rather than dropping the
    // background entirely — the composition still reads as intended.
    const stillOnly =
      speed === 0 ||
      (typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    let frame = 0;
    if (!stillOnly) {
      frame = requestAnimationFrame(function tick() {
        time += 0.05 * speed;
        render();
        frame = requestAnimationFrame(tick);
      });
    }

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.remove();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [speed, lineWidth, frequency, dispersion, tintKey, brightness]);

  return <div ref={containerRef} className={className} style={style} aria-hidden="true" />;
}
