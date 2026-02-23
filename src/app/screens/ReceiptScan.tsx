import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { X, Upload, RotateCcw, ArrowRight, Sparkles, Camera, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { useT } from '../i18n/I18nContext';
import { getCurrencyMinorDigits } from '../data/sampleData';
import Tesseract from 'tesseract.js';

type ScanTab = 'scan' | 'upload';
type ScanState = 'idle' | 'scanning' | 'result';
type UiLocale = 'zh' | 'ja';

type ParsedReceipt = { amount: string; merchant: string; date: string; score: number };
type AmountCandidate = { amount: string; value: number; score: number };

const TOTAL_HINT_RE =
  /(?:合計|合计|小計|小计|總計|総計|請求金額|請求額|總額|総額|税込|grand\s*total|amount\s*due|balance\s*due|net\s*total|total)/i;
const SUBTOTAL_HINT_RE = /(?:小計|小计|subtotal)/i;
const AMOUNT_NOISE_RE =
  /(?:tax|稅|税|discount|折扣|值引|change|找零|cash|card|visa|master|tel|電話|phone|qty|数量|item|table|seat|order)/i;
const CURRENCY_HINT_RE = /(HK\$|NT\$|S\$|US\$|RM|JPY|USD|EUR|GBP|CNY|RMB|[¥￥$€£₩฿])/i;
const MERCHANT_BLOCK_RE =
  /(?:total|subtotal|tax|receipt|invoice|amount|change|cash|card|visa|master|電話|tel|www\.|http|date|time|table|請求|金額|合計|小計)/i;

function normalizeOcrText(input: string): string {
  return input
    .replace(/[０-９Ａ-Ｚａ-ｚ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[\u3000]/g, ' ')
    .replace(/[，]/g, ',')
    .replace(/[．]/g, '.')
    .replace(/[：]/g, ':')
    .replace(/[／]/g, '/')
    .replace(/[－―ー]/g, '-')
    .replace(/[¥￥﹩]/g, '¥')
    .replace(/\r\n?/g, '\n');
}

function normalizeAmountToken(token: string): string {
  return token
    .replace(/[OoＯ○◯]/g, '0')
    .replace(/[Il｜]/g, '1')
    .replace(/[，]/g, ',')
    .replace(/[．]/g, '.')
    .replace(/[^\d,.\-]/g, '');
}

function normalizeAmount(token: string, minorDigits: number): string {
  const cleaned = normalizeAmountToken(token);
  if (!cleaned) return '';

  const unsigned = cleaned.startsWith('-') ? cleaned.slice(1) : cleaned;
  const onlyDigits = unsigned.replace(/[^\d]/g, '');
  if (!onlyDigits) return '';

  if (minorDigits === 0) {
    return String(Number.parseInt(onlyDigits, 10));
  }

  const lastComma = unsigned.lastIndexOf(',');
  const lastDot = unsigned.lastIndexOf('.');
  const lastSep = Math.max(lastComma, lastDot);
  if (lastSep !== -1) {
    const intPart = unsigned.slice(0, lastSep).replace(/[^\d]/g, '') || '0';
    const fracPart = unsigned.slice(lastSep + 1).replace(/[^\d]/g, '');
    if (fracPart.length > 0 && fracPart.length <= minorDigits) {
      const frac = fracPart.padEnd(minorDigits, '0').slice(0, minorDigits);
      return `${Number.parseInt(intPart, 10)}.${frac}`;
    }
  }

  return String(Number.parseInt(onlyDigits, 10));
}

function extractAmountCandidates(lines: string[], minorDigits: number): AmountCandidate[] {
  const candidates: AmountCandidate[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    let lineScore = 0;
    if (TOTAL_HINT_RE.test(line)) lineScore += 50;
    if (SUBTOTAL_HINT_RE.test(line)) lineScore += 18;
    if (CURRENCY_HINT_RE.test(line)) lineScore += 10;
    if (AMOUNT_NOISE_RE.test(line)) lineScore -= 8;
    if (i >= Math.max(0, lines.length - 5)) lineScore += 6;

    const amountTokenRe =
      /(HK\$|NT\$|S\$|US\$|RM|JPY|USD|EUR|GBP|CNY|RMB|[¥￥$€£₩฿])?\s*([0-9OoIl]{2,}(?:[,\.\s][0-9OoIl]{2,})*(?:[.,][0-9OoIl]{1,2})?)/gi;
    for (const m of line.matchAll(amountTokenRe)) {
      const currencyMarker = m[1] ?? '';
      const rawToken = m[2] ?? '';
      const amount = normalizeAmount(rawToken, minorDigits);
      if (!amount) continue;

      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) continue;

      const digitsOnly = normalizeAmountToken(rawToken).replace(/[^\d]/g, '');
      if (!currencyMarker && /^20\d{6}$/.test(digitsOnly)) continue; // likely yyyymmdd

      let score = lineScore + Math.min(24, Math.log10(value + 1) * 7);
      if (currencyMarker) score += 8;
      if (TOTAL_HINT_RE.test(line)) score += 8;
      if (SUBTOTAL_HINT_RE.test(line)) score -= 4; // prefer grand total over subtotal
      candidates.push({ amount, value, score });
    }
  }
  return candidates;
}

function parseDate(text: string): string {
  const normalized = normalizeOcrText(text);
  const ymd = normalized.match(/(\d{4})[\/\-.年](\d{1,2})[\/\-.月](\d{1,2})/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  }

  const yyMd = normalized.match(/(?:^|\D)(\d{2})[\/\-.](\d{1,2})[\/\-.](\d{1,2})(?:\D|$)/);
  if (yyMd) {
    const year = Number(yyMd[1]);
    const fullYear = year >= 70 ? 1900 + year : 2000 + year;
    return `${fullYear}-${yyMd[2].padStart(2, '0')}-${yyMd[3].padStart(2, '0')}`;
  }

  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const eng = normalized.match(/\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (eng) {
    const monthIdx = monthNames.findIndex((m) => eng[1].toLowerCase().startsWith(m));
    if (monthIdx >= 0) {
      return `${eng[3]}-${String(monthIdx + 1).padStart(2, '0')}-${eng[2].padStart(2, '0')}`;
    }
  }
  return '';
}

function parseMerchant(lines: string[]): string {
  const candidates = lines.slice(0, 10);
  for (const raw of candidates) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (line.length < 2 || line.length > 40) continue;
    if (MERCHANT_BLOCK_RE.test(line)) continue;
    const digitCount = (line.match(/\d/g) || []).length;
    if (digitCount > 0 && digitCount / line.length > 0.25) continue;
    if (CURRENCY_HINT_RE.test(line)) continue;
    return line;
  }
  return '';
}

function parseReceipt(text: string, currency: string): ParsedReceipt {
  const minorDigits = getCurrencyMinorDigits(currency);
  const normalized = normalizeOcrText(text);
  const lines = normalized
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 1);

  const amountCandidates = extractAmountCandidates(lines, minorDigits);
  const sortedByScore = [...amountCandidates].sort((a, b) => b.score - a.score || b.value - a.value);
  const amount = sortedByScore[0]?.amount ?? '';
  const date = parseDate(normalized);
  const merchant = parseMerchant(lines);

  const score = (amount ? 70 : 0) + (merchant ? 20 : 0) + (date ? 10 : 0);
  return { amount, merchant, date, score };
}

function computeAdaptiveBinary(
  gray: Uint8ClampedArray,
  width: number,
  height: number,
  tileSize = 28,
): Uint8ClampedArray {
  const tilesX = Math.ceil(width / tileSize);
  const tilesY = Math.ceil(height / tileSize);
  const tileSums = new Float64Array(tilesX * tilesY);
  const tileCounts = new Uint32Array(tilesX * tilesY);

  for (let y = 0; y < height; y += 1) {
    const ty = Math.floor(y / tileSize);
    for (let x = 0; x < width; x += 1) {
      const tx = Math.floor(x / tileSize);
      const tileIndex = ty * tilesX + tx;
      const px = (y * width + x) * 4;
      tileSums[tileIndex] += gray[px];
      tileCounts[tileIndex] += 1;
    }
  }

  const tileMeans = new Float64Array(tilesX * tilesY);
  for (let i = 0; i < tileMeans.length; i += 1) {
    const count = tileCounts[i] || 1;
    tileMeans[i] = tileSums[i] / count;
  }

  const out = new Uint8ClampedArray(gray.length);
  for (let y = 0; y < height; y += 1) {
    const ty = Math.floor(y / tileSize);
    for (let x = 0; x < width; x += 1) {
      const tx = Math.floor(x / tileSize);
      const tileIndex = ty * tilesX + tx;
      const px = (y * width + x) * 4;
      const localMean = tileMeans[tileIndex];
      const threshold = Math.max(88, Math.min(210, Math.round(localMean * 0.9)));
      const pixel = gray[px] >= threshold ? 255 : 0;
      out[px] = pixel;
      out[px + 1] = pixel;
      out[px + 2] = pixel;
      out[px + 3] = 255;
    }
  }
  return out;
}

async function preprocessImageVariants(imageSource: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxSide = 2200;
      const side = Math.max(img.width, img.height);
      const scale = Math.min(2, Math.max(1, maxSide / Math.max(1, side)));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error('Unable to create canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const enhanced = new Uint8ClampedArray(imageData.data);

      let sum = 0;
      for (let i = 0; i < enhanced.length; i += 4) {
        const lum = 0.299 * enhanced[i] + 0.587 * enhanced[i + 1] + 0.114 * enhanced[i + 2];
        const contrast = (lum - 128) * 1.35 + 128;
        const pixel = Math.max(0, Math.min(255, Math.round(contrast)));
        enhanced[i] = pixel;
        enhanced[i + 1] = pixel;
        enhanced[i + 2] = pixel;
        enhanced[i + 3] = 255;
        sum += pixel;
      }

      const avgLum = sum / (width * height);
      const threshold = Math.max(110, Math.min(195, Math.round(avgLum * 0.92)));
      const binary = new Uint8ClampedArray(enhanced);
      for (let i = 0; i < binary.length; i += 4) {
        const pixel = binary[i] >= threshold ? 255 : 0;
        binary[i] = pixel;
        binary[i + 1] = pixel;
        binary[i + 2] = pixel;
      }

      const enhancedImage = new ImageData(enhanced, width, height);
      ctx.putImageData(enhancedImage, 0, 0);
      const enhancedDataUrl = canvas.toDataURL('image/png');

      const binaryImage = new ImageData(binary, width, height);
      ctx.putImageData(binaryImage, 0, 0);
      const binaryDataUrl = canvas.toDataURL('image/png');

      const adaptive = computeAdaptiveBinary(enhanced, width, height);
      const adaptiveImage = new ImageData(adaptive, width, height);
      ctx.putImageData(adaptiveImage, 0, 0);
      const adaptiveDataUrl = canvas.toDataURL('image/png');

      resolve([enhancedDataUrl, binaryDataUrl, adaptiveDataUrl]);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageSource;
  });
}

async function centerCropVariant(
  imageSource: string,
  widthRatio = 0.9,
  heightRatio = 0.82,
): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const cropW = Math.max(1, Math.round(img.width * widthRatio));
      const cropH = Math.max(1, Math.round(img.height * heightRatio));
      const sx = Math.max(0, Math.round((img.width - cropW) / 2));
      const sy = Math.max(0, Math.round((img.height - cropH) / 2));

      const canvas = document.createElement('canvas');
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, cropW, cropH);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = imageSource;
  });
}

async function smartReceiptCropVariant(imageSource: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height).data;

      let sumLum = 0;
      const total = img.width * img.height;
      for (let i = 0; i < imageData.length; i += 4) {
        sumLum += 0.299 * imageData[i] + 0.587 * imageData[i + 1] + 0.114 * imageData[i + 2];
      }
      const avgLum = sumLum / Math.max(1, total);
      const brightThreshold = Math.min(250, avgLum + 20);

      let minX = img.width;
      let minY = img.height;
      let maxX = 0;
      let maxY = 0;
      let brightCount = 0;

      for (let y = 0; y < img.height; y += 1) {
        for (let x = 0; x < img.width; x += 1) {
          const idx = (y * img.width + x) * 4;
          const lum = 0.299 * imageData[idx] + 0.587 * imageData[idx + 1] + 0.114 * imageData[idx + 2];
          if (lum >= brightThreshold) {
            brightCount += 1;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (brightCount < total * 0.1 || maxX <= minX || maxY <= minY) {
        resolve(null);
        return;
      }

      const marginX = Math.round((maxX - minX) * 0.06);
      const marginY = Math.round((maxY - minY) * 0.06);
      const sx = Math.max(0, minX - marginX);
      const sy = Math.max(0, minY - marginY);
      const sw = Math.min(img.width - sx, maxX - minX + marginX * 2);
      const sh = Math.min(img.height - sy, maxY - minY + marginY * 2);

      if (sw < img.width * 0.45 || sh < img.height * 0.45) {
        resolve(null);
        return;
      }

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = sw;
      cropCanvas.height = sh;
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) {
        resolve(null);
        return;
      }
      cropCtx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      resolve(cropCanvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = imageSource;
  });
}

async function rotateVariant(imageSource: string, degree: number): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const normalized = ((degree % 360) + 360) % 360;
      const rad = (normalized * Math.PI) / 180;
      const absSin = Math.abs(Math.sin(rad));
      const absCos = Math.abs(Math.cos(rad));
      const outW = Math.max(1, Math.round(img.width * absCos + img.height * absSin));
      const outH = Math.max(1, Math.round(img.width * absSin + img.height * absCos));

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.translate(outW / 2, outH / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = imageSource;
  });
}

export function ReceiptScan() {
  const navigate = useNavigate();
  const { showToast, currency } = useApp();
  const { t, locale } = useT();

  const [tab, setTab] = useState<ScanTab>('scan');
  const [state, setState] = useState<ScanState>('idle');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [noAmountWarning, setNoAmountWarning] = useState(false);
  const [scanWarning, setScanWarning] = useState<string | null>(null);

  // Result fields (editable)
  const [resultAmount, setResultAmount] = useState('');
  const [resultMerchant, setResultMerchant] = useState('');
  const [resultDate, setResultDate] = useState('');

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Camera lifecycle ──────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      const msg =
        err?.name === 'NotAllowedError'
          ? t.receiptScan.cameraPermDenied
          : t.receiptScan.cameraError;
      setCameraError(msg);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (tab === 'scan' && state === 'idle') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [tab, state, startCamera, stopCamera]);

  // ── OCR pipeline ──────────────────────────────────────────────────
  async function runOCR(imageSource: string) {
    setState('scanning');
    setOcrProgress(0);
    setNoAmountWarning(false);
    setScanWarning(null);

    let worker: Tesseract.Worker | null = null;
    let fallbackWorker: Tesseract.Worker | null = null;
    try {
      const [variants, centerCrop, smartCrop] = await Promise.all([
        preprocessImageVariants(imageSource).catch(() => []),
        centerCropVariant(imageSource),
        smartReceiptCropVariant(imageSource),
      ]);
      const deskewBase = smartCrop || centerCrop || variants[0] || imageSource;
      const [deskewNeg, deskewPos] = await Promise.all([
        rotateVariant(deskewBase, -5),
        rotateVariant(deskewBase, 5),
      ]);

      const baseTargets = [imageSource, ...variants, centerCrop, smartCrop, deskewNeg, deskewPos]
        .filter((s): s is string => !!s);
      const scanTargets = Array.from(new Set(baseTargets));

      let passCursor = 0;
      let totalPasses = Math.max(1, scanTargets.length);
      const primaryLang = (locale as UiLocale) === 'ja' ? 'jpn+eng' : 'chi_tra+eng';
      const secondaryLang = (locale as UiLocale) === 'ja' ? 'chi_tra+eng' : 'jpn+eng';

      worker = await Tesseract.createWorker(primaryLang, undefined, {
        logger: (m: Tesseract.LoggerMessage) => {
          if (m.status === 'recognizing text') {
            const overallProgress = ((passCursor + m.progress) / totalPasses) * 100;
            setOcrProgress(Math.max(1, Math.min(99, Math.round(overallProgress))));
          }
        },
      });

      await worker.setParameters({
        preserve_interword_spaces: '1',
        user_defined_dpi: '300',
      } as Record<string, string>);

      let best: { parsed: ParsedReceipt; confidence: number } | null = null;
      const allTexts: string[] = [];
      for (let i = 0; i < scanTargets.length; i += 1) {
        const psm = i === scanTargets.length - 1 ? '11' : '6';
        await worker.setParameters({ tessedit_pageseg_mode: psm } as Record<string, string>);
        const { data } = await worker.recognize(scanTargets[i], { rotateAuto: true });
        passCursor += 1;
        setOcrProgress(Math.max(1, Math.min(99, Math.round((passCursor / totalPasses) * 100))));

        allTexts.push(data.text || '');
        const parsed = parseReceipt(data.text || '', currency);
        const weightedScore = parsed.score + (data.confidence ?? 0) * 0.4;
        if (!best || weightedScore > (best.parsed.score + best.confidence * 0.4)) {
          best = { parsed, confidence: data.confidence ?? 0 };
        }
      }

      const mergedParsed = parseReceipt(allTexts.join('\n'), currency);
      if (!best || mergedParsed.score > best.parsed.score) {
        best = { parsed: mergedParsed, confidence: 0 };
      }

      const parsed = best?.parsed ?? { amount: '', merchant: '', date: '', score: 0 };
      const bestConfidence = best?.confidence ?? 0;

      if ((!parsed.amount || bestConfidence < 45) && secondaryLang !== primaryLang) {
        const fallbackTargets = [smartCrop, centerCrop, variants[2], variants[1], variants[0], imageSource]
          .filter((s): s is string => !!s);
        if (fallbackTargets.length > 0) {
          totalPasses += fallbackTargets.length;
          fallbackWorker = await Tesseract.createWorker(secondaryLang, undefined, {
            logger: (m: Tesseract.LoggerMessage) => {
              if (m.status === 'recognizing text') {
                const overallProgress = ((passCursor + m.progress) / totalPasses) * 100;
                setOcrProgress(Math.max(1, Math.min(99, Math.round(overallProgress))));
              }
            },
          });
          await fallbackWorker.setParameters({
            preserve_interword_spaces: '1',
            user_defined_dpi: '300',
            tessedit_pageseg_mode: '6',
          } as Record<string, string>);

          for (const target of fallbackTargets) {
            const { data } = await fallbackWorker.recognize(target, { rotateAuto: true });
            passCursor += 1;
            setOcrProgress(Math.max(1, Math.min(99, Math.round((passCursor / totalPasses) * 100))));
            const candidate = parseReceipt(data.text || '', currency);
            const candidateWeight = candidate.score + (data.confidence ?? 0) * 0.4;
            const bestWeight = (best?.parsed.score ?? 0) + (best?.confidence ?? 0) * 0.4;
            if (candidateWeight > bestWeight) {
              best = { parsed: candidate, confidence: data.confidence ?? 0 };
              parsed.amount = candidate.amount || parsed.amount;
              parsed.merchant = candidate.merchant || parsed.merchant;
              parsed.date = candidate.date || parsed.date;
              parsed.score = Math.max(parsed.score, candidate.score);
            }
            if (parsed.amount && parsed.score >= 75) break;
          }
        }
      }

      if (!parsed.amount) {
        const amountBase = variants[2] || variants[1] || variants[0] || smartCrop || centerCrop || imageSource;
        const [rot90, rot270] = await Promise.all([
          rotateVariant(amountBase, 90),
          rotateVariant(amountBase, 270),
        ]);
        const amountTargets = [amountBase, rot90, rot270].filter((s): s is string => !!s);

        if (amountTargets.length > 0) {
          totalPasses += amountTargets.length;
          await worker.setParameters({
            tessedit_pageseg_mode: '6',
            tessedit_char_whitelist: '0123456789.,:/-¥￥$HKNTSRMUSDEURGBPCNYJPY年月日',
          } as Record<string, string>);

          for (const target of amountTargets) {
            const { data } = await worker.recognize(target, { rotateAuto: true });
            passCursor += 1;
            setOcrProgress(Math.max(1, Math.min(99, Math.round((passCursor / totalPasses) * 100))));
            const candidate = parseReceipt(data.text || '', currency);
            if (candidate.amount) {
              parsed.amount = candidate.amount;
              parsed.score = Math.max(parsed.score, candidate.score);
              if (!parsed.date && candidate.date) parsed.date = candidate.date;
              if (!parsed.merchant && candidate.merchant) parsed.merchant = candidate.merchant;
              break;
            }
          }

          await worker.setParameters({
            tessedit_char_whitelist: '',
          } as Record<string, string>);
        }
      }

      setOcrProgress(100);

      setResultAmount(parsed.amount);
      setResultMerchant(parsed.merchant);
      setResultDate(parsed.date || new Date().toISOString().split('T')[0]);

      if (!parsed.amount) {
        setNoAmountWarning(true);
      }

      setState('result');
    } catch (err) {
      console.error('OCR failed:', err);
      // Fall back to manual confirmation instead of blocking the flow.
      setResultAmount('');
      setResultMerchant('');
      setResultDate(new Date().toISOString().split('T')[0]);
      setNoAmountWarning(true);
      setScanWarning(t.receiptScan.ocrFailed);
      setState('result');
      showToast('info', t.receiptScan.manualFallback);
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch {
          // Ignore worker cleanup errors.
        }
      }
      if (fallbackWorker) {
        try {
          await fallbackWorker.terminate();
        } catch {
          // Ignore worker cleanup errors.
        }
      }
    }
  }

  // ── Capture from camera ───────────────────────────────────────────
  function handleCapture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (!video.videoWidth || !video.videoHeight) {
      showToast('error', t.receiptScan.cameraNotReady);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    stopCamera();
    runOCR(dataUrl);
  }

  // ── Upload handler ────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        runOCR(reader.result);
      }
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be selected again
    e.target.value = '';
  }

  // ── Confirm → navigate to AddExpense ──────────────────────────────
  function handleConfirm() {
    showToast('success', t.receiptScan.recognized);
    navigate('/app/add-expense', {
      state: {
        scanData: {
          amount: Number(resultAmount) || 0,
          description: resultMerchant,
          category: 'food' as const,
          date: resultDate,
        },
      },
    });
  }

  function handleManualEntry() {
    navigate('/app/add-expense');
  }

  // ── Reset ─────────────────────────────────────────────────────────
  function handleReset() {
    setState('idle');
    setNoAmountWarning(false);
    setScanWarning(null);
    setOcrProgress(0);
  }

  // ── Currency symbol ───────────────────────────────────────────────
  // currency already stores the symbol (e.g. '¥', 'HK$', 'NT$')
  const sym = currency;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
      {/* ── Close Button ──────────────────────────────────────────── */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-14 right-4 z-20 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white active:scale-90 transition-transform"
      >
        <X size={18} strokeWidth={2} />
      </button>

      <h1 className="absolute top-14 left-4 z-20 text-white font-black text-lg">{t.receiptScan.title}</h1>

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Camera Viewfinder / Upload Area ─────────────────────────── */}
      <div className="flex-1 relative flex items-center justify-center">
        {/* Camera video feed */}
        {tab === 'scan' && state === 'idle' && !cameraError && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Dark bg when not showing camera */}
        {(tab !== 'scan' || state !== 'idle' || cameraError) && (
          <div className="absolute inset-0 bg-gradient-to-b from-[#1A0808] via-[#0E0505] to-[#1A0808]" />
        )}

        {/* Camera error message */}
        {tab === 'scan' && cameraError && state === 'idle' && (
          <div className="relative z-10 flex flex-col items-center gap-3 px-8 text-center">
            <div className="w-14 h-14 rounded-full bg-accent-bg flex items-center justify-center">
              <AlertTriangle size={24} className="text-primary" />
            </div>
            <p className="text-foreground text-sm leading-relaxed">{cameraError}</p>
            <button
              onClick={() => setTab('upload')}
              className="mt-2 bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold active:scale-95 transition-transform"
            >
              {t.receiptScan.switchToUpload}
            </button>
          </div>
        )}

        {/* Scanning animation */}
        {state === 'scanning' && (
          <motion.div
            className="absolute left-[10%] right-[10%] h-0.5 bg-primary shadow-[0_0_20px_#DD843C] z-10"
            initial={{ top: '20%' }}
            animate={{ top: '80%' }}
            transition={{ duration: 1.5, repeat: Infinity, repeatType: 'loop', ease: 'linear' }}
          />
        )}

        {/* Viewfinder guide (idle) */}
        {state === 'idle' && !cameraError && (
          <div className="relative z-10">
            <div className="w-72 h-48 relative">
              {[
                'top-0 left-0 border-t-2 border-l-2',
                'top-0 right-0 border-t-2 border-r-2',
                'bottom-0 left-0 border-b-2 border-l-2',
                'bottom-0 right-0 border-b-2 border-r-2',
              ].map((cls, i) => (
                <div key={i} className={`absolute w-6 h-6 border-primary/80 ${cls}`} />
              ))}
              <div className="absolute inset-2 border-2 border-dashed border-primary/25 rounded-lg flex items-center justify-center">
                <p className="text-primary/60 text-xs text-center px-4">
                  {tab === 'scan' ? t.receiptScan.receiptInFrame : t.receiptScan.selectPhoto}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Scanning state: spinner + progress */}
        {state === 'scanning' && (
          <div className="relative z-10 flex flex-col items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full"
            />
            <p className="text-primary/80 text-sm font-bold">{t.receiptScan.recognizing}</p>
            {ocrProgress > 0 && (
              <div className="w-48 h-1.5 bg-switch-background rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${ocrProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}
            <p className="text-muted-foreground text-xs">
              {ocrProgress > 0 ? `${ocrProgress}%` : t.receiptScan.loadingModel}
            </p>
          </div>
        )}

        {/* Result overlay */}
        <AnimatePresence>
          {state === 'result' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/70 flex items-center justify-center z-20 px-4"
            >
              <motion.div
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-card border border-border rounded-3xl p-6 w-full max-w-sm shadow-2xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-foreground">{t.receiptScan.resultTitle}</h3>
                  <span className="flex items-center gap-1 bg-accent-bg text-primary text-xs px-2 py-1 rounded-full font-bold">
                    <Sparkles size={11} strokeWidth={2} /> {t.receiptScan.ocrLocal}
                  </span>
                </div>

                {scanWarning && (
                  <div className="flex items-center gap-2 bg-accent-bg/60 border border-primary/30 rounded-xl px-3 py-2 mb-4">
                    <AlertTriangle size={14} className="text-primary shrink-0" />
                    <p className="text-xs text-primary">{scanWarning}</p>
                  </div>
                )}

                {noAmountWarning && !scanWarning && (
                  <div className="flex items-center gap-2 bg-accent-bg/60 border border-primary/30 rounded-xl px-3 py-2 mb-4">
                    <AlertTriangle size={14} className="text-primary shrink-0" />
                    <p className="text-xs text-primary">{t.receiptScan.noAmount}</p>
                  </div>
                )}

                <div className="space-y-3 mb-5">
                  {/* Amount */}
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-xs text-muted-foreground">{t.receiptScan.amountLabel}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-foreground text-sm">{sym}</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={resultAmount}
                        onChange={(e) => setResultAmount(e.target.value.replace(/[^\d]/g, ''))}
                        placeholder="0"
                        className="w-28 text-right font-black text-xl text-foreground tabular-nums bg-transparent outline-none placeholder:text-subtle"
                      />
                    </div>
                  </div>

                  {/* Merchant */}
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-xs text-muted-foreground shrink-0 mr-3">{t.receiptScan.merchantLabel}</span>
                    <input
                      type="text"
                      value={resultMerchant}
                      onChange={(e) => setResultMerchant(e.target.value)}
                      placeholder={t.receiptScan.merchantPlaceholder}
                      className="flex-1 text-right text-sm font-bold text-foreground bg-transparent outline-none placeholder:text-subtle"
                    />
                  </div>

                  {/* Date */}
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs text-muted-foreground shrink-0 mr-3">{t.receiptScan.dateLabel}</span>
                    <input
                      type="date"
                      value={resultDate}
                      onChange={(e) => setResultDate(e.target.value)}
                      className="text-sm text-foreground bg-transparent outline-none [color-scheme:dark]"
                    />
                  </div>
                </div>

                <button
                  onClick={handleConfirm}
                  className="w-full bg-primary text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 mb-2 active:scale-98 transition-transform shadow-lg shadow-primary/25"
                >
                  {t.receiptScan.confirmAdd} <ArrowRight size={16} strokeWidth={2} />
                </button>
                <button
                  onClick={handleReset}
                  className="w-full text-muted-foreground text-sm py-2 flex items-center justify-center gap-1 active:opacity-70"
                >
                  <RotateCcw size={13} strokeWidth={2} /> {t.receiptScan.rescan}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom Panel ──────────────────────────────────────────── */}
      <div className="bg-sidebar border-t border-border rounded-t-3xl px-4 pt-4 pb-8 shadow-[0_-8px_40px_rgba(0,0,0,0.5)]">
        {/* Tabs */}
        <div className="flex gap-1 bg-secondary rounded-xl p-1 mb-4">
          {(['scan', 'upload'] as const).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => { setTab(tabKey); setState('idle'); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5
                ${tab === tabKey ? 'bg-sidebar text-primary shadow-sm' : 'text-subtle'}`}
            >
              {tabKey === 'scan' ? (
                <><Camera size={14} strokeWidth={2} /> {t.receiptScan.scanTab}</>
              ) : (
                <><Upload size={14} strokeWidth={2} /> {t.receiptScan.uploadTab}</>
              )}
            </button>
          ))}
        </div>

        {tab === 'scan' ? (
          <button
            onClick={handleCapture}
            disabled={state === 'scanning' || !!cameraError}
            className="w-full bg-primary disabled:bg-accent-bg text-white rounded-xl py-4 font-bold text-base shadow-lg shadow-primary/25 disabled:text-muted-foreground transition-all active:scale-98 flex items-center justify-center gap-2"
          >
            <Camera size={18} strokeWidth={2} />
            {state === 'scanning' ? t.receiptScan.capturing : t.receiptScan.captureBtn}
          </button>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={state === 'scanning'}
            className="w-full border-2 border-dashed border-primary/40 disabled:border-accent-bg text-primary disabled:text-muted-foreground rounded-xl py-4 font-bold flex items-center justify-center gap-2 active:border-primary/60 transition-colors"
          >
            <Upload size={18} strokeWidth={2} />
            {state === 'scanning' ? t.receiptScan.selecting : t.receiptScan.selectBtn}
          </button>
        )}

        <button
          onClick={handleManualEntry}
          className="w-full mt-3 text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {t.receiptScan.manualEntry}
        </button>
      </div>
    </div>
  );
}
