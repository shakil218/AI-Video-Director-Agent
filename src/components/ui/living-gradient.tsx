'use client';

import React, { useEffect, useRef } from 'react';

/**
 * LivingGradient
 * Full-viewport animated simplex-noise gradient with colour blending,
 * vignette and film grain. Pure WebGL, no dependencies.
 *
 * Usage: render it as the FIRST child of a parent that has `relative isolate`.
 * It is fixed, sits behind everything (z-index -10) and ignores pointer events.
 */

interface LivingGradientProps {
  /** 0 – 1.5. Lower = calmer / darker so UI text stays readable. */
  intensity?: number;
  /** Animation speed multiplier. */
  speed?: number;
  /** Film grain strength. */
  grain?: number;
  /** Render resolution multiplier (0.5 – 1). Lower is cheaper on GPU. */
  resolutionScale?: number;
  className?: string;
}

const VERTEX_SRC = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAGMENT_SRC = `
precision highp float;

uniform vec2  u_res;
uniform float u_time;
uniform float u_intensity;
uniform float u_grain;

// --- Ashima 2D simplex noise -------------------------------------------
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

  float t = u_time * 0.05;

  // Three octaves drifting in different directions = "living" motion
  float n1 = snoise(p * 1.1 + vec2( t, -t * 0.7));
  float n2 = snoise(p * 1.9 - vec2( t * 0.8, t * 0.5) + 7.0);
  float n3 = snoise(p * 0.6 + vec2( 0.0, t * 0.6) + 13.0);

  float field = n1 * 0.55 + n2 * 0.25 + n3 * 0.5;
  field = field * 0.5 + 0.5;

  // Lavender palette (dark -> light)
  vec3 base  = vec3(0.020, 0.018, 0.035); // near-black violet, matches #050507
  vec3 deep  = vec3(0.235, 0.169, 0.478); // #3C2B7A
  vec3 mid   = vec3(0.541, 0.451, 0.851); // #8A73D9
  vec3 light = vec3(0.804, 0.741, 1.000); // #CDBDFF lavender

  vec3 col = mix(base, deep, smoothstep(0.10, 0.60, field));
  col = mix(col, mid,   smoothstep(0.45, 0.85, field));
  col = mix(col, light, smoothstep(0.75, 1.00, field) * 0.6);

  // Vignette: glow in the middle, dark toward the edges
  float r = length(p * vec2(0.8, 0.9));
  float vig = smoothstep(1.15, 0.2, r);
  col *= mix(0.30, 1.0, vig);

  col *= u_intensity;

  // Film grain
  float g = hash(gl_FragCoord.xy + fract(u_time) * 100.0) - 0.5;
  col += g * u_grain;

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[LivingGradient] shader error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function LivingGradient({
  intensity = 0.6,
  speed = 1,
  grain = 0.035,
  resolutionScale = 0.75,
  className,
}: LivingGradientProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) return; // CSS fallback background stays visible

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SRC);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('[LivingGradient] link error:', gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, 'u_res');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uIntensity = gl.getUniformLocation(program, 'u_intensity');
    const uGrain = gl.getUniformLocation(program, 'u_grain');

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr * resolutionScale));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr * resolutionScale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const draw = (seconds: number) => {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, seconds * speed);
      gl.uniform1f(uIntensity, intensity);
      gl.uniform1f(uGrain, grain);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0;
    const start = performance.now();

    const loop = (now: number) => {
      draw((now - start) / 1000 + 20); // +20 offsets away from the noise origin
      raf = requestAnimationFrame(loop);
    };

    const onResize = () => {
      resize();
      if (reduceMotion.matches) draw(20);
    };

    resize();
    window.addEventListener('resize', onResize);

    if (reduceMotion.matches) {
      draw(20); // single still frame
    } else {
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [intensity, speed, grain, resolutionScale]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: -10,
        pointerEvents: 'none',
        // Shows instantly on load and acts as the fallback if WebGL is unavailable
        background:
          'radial-gradient(ellipse at 50% 40%, rgba(138,115,217,0.35), rgba(60,43,122,0.18) 45%, #050507 80%)',
      }}
    />
  );
}

export default LivingGradient;
