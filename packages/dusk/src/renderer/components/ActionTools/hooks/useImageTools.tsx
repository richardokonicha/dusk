import { loggerService } from '@logger'
import { useTheme } from '@renderer/hooks/useTheme'
import { ImagePreviewService } from '@renderer/services/ImagePreviewService'
import { toast } from '@renderer/services/toast'
import { download as downloadFile } from '@renderer/utils/download'
import { svgToPngBlob, svgToSvgBlob } from '@renderer/utils/image'
import type { RefObject } from 'react'
import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

const logger = loggerService.withContext('usePreviewToolHandlers')

/**
 * Custom hook for image processing tools
 * Provides image zoom, copy, and download functionality
 */
export const useImageTools = (
  containerRef: RefObject<HTMLDivElement | null>,
  options: {
    prefix: string
    imgSelector: string
    enableDrag?: boolean
    enableWheelZoom?: boolean
  }
) => {
  const transformRef = useRef({ scale: 1, x: 0, y: 0 }) // Manage transform state
  const { imgSelector, prefix, enableDrag, enableWheelZoom } = options
  const { t } = useTranslation()
  const { theme } = useTheme()

  // Create selector function
  const getImgElement = useCallback((): SVGElement | null => {
    if (!containerRef.current) return null

    // Try to find in Shadow DOM first
    const shadowRoot = containerRef.current.shadowRoot
    if (shadowRoot) {
      return shadowRoot.querySelector<SVGElement>(imgSelector)
    }

    // Fall back to regular DOM query
    return containerRef.current.querySelector<SVGElement>(imgSelector)
  }, [containerRef, imgSelector])

  // Get original image element (remove all transforms)
  const getCleanImgElement = useCallback((): SVGElement | null => {
    const imgElement = getImgElement()
    if (!imgElement) return null

    const clonedElement = imgElement.cloneNode(true) as SVGElement
    clonedElement.style.transform = ''
    clonedElement.style.transformOrigin = ''
    return clonedElement
  }, [getImgElement])

  // Query current position
  const getCurrentPosition = useCallback(() => {
    const imgElement = getImgElement()
    if (!imgElement) return transformRef.current

    const transform = imgElement.style.transform
    if (!transform || transform === 'none') return transformRef.current

    // Use CSS matrix parsing
    const matrix = new DOMMatrix(transform)
    return { x: matrix.m41, y: matrix.m42 }
  }, [getImgElement])

  /**
   * Apply pan/zoom transform
   * @param element Element to apply transform to
   * @param x X-axis offset
   * @param y Y-axis offset
   * @param scale Zoom scale
   */
  const applyTransform = useCallback((element: SVGElement | null, x: number, y: number, scale: number) => {
    if (!element) return
    element.style.transformOrigin = 'top left'
    element.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
  }, [])

  /**
   * Pan function - move image by specified direction and distance
   * @param dx X-axis offset (positive right, negative left)
   * @param dy Y-axis offset (positive down, negative up)
   * @param absolute Whether absolute position (true) or relative offset (false)
   */
  const pan = useCallback(
    (dx: number, dy: number, absolute = false) => {
      const currentPos = getCurrentPosition()
      const newX = absolute ? dx : currentPos.x + dx
      const newY = absolute ? dy : currentPos.y + dy

      transformRef.current.x = newX
      transformRef.current.y = newY

      const imgElement = getImgElement()
      applyTransform(imgElement, newX, newY, transformRef.current.scale)
    },
    [getCurrentPosition, getImgElement, applyTransform]
  )

  // Drag pan support
  useEffect(() => {
    if (!enableDrag || !containerRef.current) return

    const container = containerRef.current
    const startPos = { x: 0, y: 0 }

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startPos.x
      const dy = e.clientY - startPos.y

      // Calculate directly using initial offset from transformRef
      const newX = transformRef.current.x + dx
      const newY = transformRef.current.y + dy

      const imgElement = getImgElement()
      // Apply transform in real-time, but don't update ref to avoid accumulated error
      applyTransform(imgElement, newX, newY, transformRef.current.scale)
      e.preventDefault()
    }

    const handleMouseUp = (e: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)

      container.style.cursor = 'default'

      // After drag ends, calculate final position and update ref
      const dx = e.clientX - startPos.x
      const dy = e.clientY - startPos.y
      transformRef.current.x += dx
      transformRef.current.y += dy
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return // Only respond to left click

      // Each drag starts from current position in ref
      const currentPos = getCurrentPosition()
      transformRef.current.x = currentPos.x
      transformRef.current.y = currentPos.y

      startPos.x = e.clientX
      startPos.y = e.clientY

      container.style.cursor = 'grabbing'
      e.preventDefault()

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    container.addEventListener('mousedown', handleMouseDown)

    return () => {
      container.removeEventListener('mousedown', handleMouseDown)
      // Cleanup just in case, e.g. component unmounts during drag
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [containerRef, getImgElement, applyTransform, getCurrentPosition, enableDrag])

  /**
   * Zoom
   * @param delta Zoom delta (positive zoom in, negative zoom out)
   */
  const zoom = useCallback(
    (delta: number, absolute = false) => {
      const newScale = absolute
        ? Math.max(0.1, Math.min(3, delta))
        : Math.max(0.1, Math.min(3, transformRef.current.scale + delta))

      transformRef.current.scale = newScale

      const imgElement = getImgElement()
      applyTransform(imgElement, transformRef.current.x, transformRef.current.y, newScale)
    },
    [getImgElement, applyTransform]
  )

  // Wheel zoom support
  useEffect(() => {
    if (!enableWheelZoom || !containerRef.current) return

    const container = containerRef.current

    const handleWheel = (e: WheelEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.target) {
        // Confirm event occurs inside container
        if (container.contains(e.target as Node)) {
          e.preventDefault()
          e.stopPropagation()
          const delta = e.deltaY < 0 ? 0.1 : -0.1
          zoom(delta)
        }
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [containerRef, zoom, enableWheelZoom])

  /**
   * Copy image
   *
   * Currently uses cleaned transform image, so not applicable to canvas
   */
  const copy = useCallback(async () => {
    try {
      const imgElement = getCleanImgElement()
      if (!imgElement) return false

      const blob = await svgToPngBlob(imgElement)
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      toast.success(t('message.copy.success'))
      return true
    } catch (error) {
      logger.error('Copy failed:', error as Error)
      toast.error(t('message.copy.failed'))
      return false
    }
  }, [getCleanImgElement, t])

  /**
   * Download image
   *
   * Currently uses cleaned transform image, so not applicable to canvas
   */
  const download = useCallback(
    async (format: 'svg' | 'png') => {
      try {
        const imgElement = getCleanImgElement()
        if (!imgElement) return

        const timestamp = Date.now()

        if (format === 'svg') {
          const blob = svgToSvgBlob(imgElement)
          const url = URL.createObjectURL(blob)
          await downloadFile(url, `${prefix}-${timestamp}.svg`)
          URL.revokeObjectURL(url)
        } else {
          const blob = await svgToPngBlob(imgElement)
          const pngUrl = URL.createObjectURL(blob)
          await downloadFile(pngUrl, `${prefix}-${timestamp}.png`)
          URL.revokeObjectURL(pngUrl)
        }
      } catch (error) {
        logger.error('Download failed:', error as Error)
        toast.error(t('message.download.failed'))
      }
    },
    [getCleanImgElement, prefix, t]
  )

  /**
   * Preview dialog
   *
   * Currently uses cleaned transform image, so not applicable to canvas
   */
  const dialog = useCallback(async () => {
    try {
      const imgElement = getCleanImgElement()
      if (!imgElement) return

      await ImagePreviewService.show(imgElement, { format: 'svg' })
    } catch (error) {
      logger.error('Dialog preview failed:', error as Error)
      toast.error(t('message.dialog.failed'))
    }
  }, [getCleanImgElement, t])

  // Get current transform state
  const getCurrentTransform = useCallback(() => {
    return {
      scale: transformRef.current.scale,
      x: transformRef.current.x,
      y: transformRef.current.y
    }
  }, [transformRef])

  // Reset transform on theme change
  useEffect(() => {
    pan(0, 0, true)
    zoom(1, true)
  }, [pan, zoom, theme])

  return {
    zoom,
    pan,
    copy,
    download,
    dialog,
    getCurrentTransform
  }
}
