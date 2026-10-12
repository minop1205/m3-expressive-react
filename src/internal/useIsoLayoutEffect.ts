'use client'

import { useEffect, useLayoutEffect } from 'react'

/**
 * `useLayoutEffect` on the client, `useEffect` during server rendering.
 * React 18 warns when `useLayoutEffect` is called under `react-dom/server`;
 * neither effect runs there, so the swap changes nothing on the client and
 * silences the warning on the server (#410).
 */
export const useIsoLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect
