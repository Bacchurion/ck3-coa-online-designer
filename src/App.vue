<template>
  <div class="container-fluid app-root">
    <notifications />
    <!-- Block interface during import -->
    <div v-if="isImporting" class="import-blocker">
      <div class="import-spinner">
        <div class="spinner-border text-warning" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Loading...</span>
        </div>
        <div class="import-text">{{ $t('import_loading') }}</div>
      </div>
    </div>
    <div class="row app-row">
      <div class="col-4 sidebar-left">
        <SidebarPanel
          :canvas-images="canvasImages"
          :stage-size="stageSize"
          :pattern-colors="patternColors"
          :selected-pattern-file-name="selectedPatternFileName"
          @add-image="addImage"
          @remove-image="removeImage"
          @copy-export="copyExportToClipboard"
          @set-pattern="setPattern"
          @drop="handleSidebarDrop"
          @override-pattern-primary="overridePatternPrimaryColor"
          @override-pattern-secondary="overridePatternSecondaryColor"
          @override-pattern-tertiary="overridePatternTertiaryColor"
        />
      </div>
      <div class="col-4 canvas-center d-flex flex-column align-items-center justify-content-center">
        <CanvasToolbar
          :pattern-file-name="selectedPatternFileName"
          :pattern-colors="patternColors"
          :emblems="canvasImages"
          :canvas-size="stageSize"
          @import-data="handleImportData"
          @reset-emblem="showResetModal = true"
        />
        <MainCanvas
          ref="mainCanvasRef"
          :canvas-images="canvasImages"
          :canvas-size="canvasSize"
          :selected-index="selectedIndex"
          :selected-pattern-el="selectedPatternEl"
          :stage-size="stageSize"
          @update:selected-index="selectedIndex = $event"
          @drop="handleSidebarDrop"
          @transform-end="handleCanvasTransformEnd"
          @drag-end="handleCanvasDragEnd"
        />
        <!-- Non-interactive Preview -->
        <PreviewCanvas
          :preview-image="miniatureImage"
          :canvas-size="stageSize"
          :patternColors="patternColors"
        />
      </div>
      <div class="col-4 sidebar-right">
        <LayersPanel
          :canvas-images="canvasImages"
          :selected-index="selectedIndex"
          @select="handleLayerClick"
          @remove="removeImage"
          @dragstart="onLayerDragStart"
          @drop="onLayerDrop"
          @update-emblem-color="handleUpdateEmblemColor"
          @set-emblem-pos="handleSetEmblemPos"
          @set-emblem-stretch="handleSetEmblemStretch"
          @update-emblem-rotation="handleUpdateEmblemRotation"
          @set-emblem-mask="handleSetEmblemMask"
          @flip-horizontal="handleFlipHorizontal"
          @flip-vertical="handleFlipVertical"
        />
      </div>
    </div>
  </div>

  <!-- Reset confirmation modal -->
  <div v-if="showResetModal" class="modal-backdrop">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <span class="modal-title">{{ $t('reset_emblem_confirm_title') }}</span>
        </div>
        <div class="modal-body">
          <p>{{ $t('reset_emblem_confirm_body') }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-danger" @click="confirmResetEmblem">{{ $t('reset_emblem_confirm_yes') }}</button>
          <button class="btn btn-secondary" @click="showResetModal = false">{{ $t('reset_emblem_confirm_no') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SidebarPanel from './components/SidebarPanel.vue'
import CanvasToolbar from './components/CanvasToolbar.vue'
import MainCanvas from './components/MainCanvas.vue'
import LayersPanel from './components/LayersPanel.vue'
import PreviewCanvas from './components/PreviewCanvas.vue'
import emblemsData from './assets/emblems.json'
import Konva from 'konva'
import { namedColors } from '@/utils/colors'
import { notify } from "@kyvg/vue3-notification"
const { t: $t } = useI18n()
// Lower rendering resolution on HiDPI to speed up draws
Konva.pixelRatio = 1

const canvasImages = ref([]) // [{...}]
const canvasSize = ref(400)
const stageSize = { width: canvasSize.value, height: canvasSize.value }
const selectedIndex = ref(null)
const selectedPatternEl = ref(null)
const draggedLayerIndex = ref(null)
const mainCanvasRef = ref(null)
const showResetModal = ref(false)
const isImporting = ref(false)
let copiedImage = null

const originalPatternUrl = ref(null)
const selectedPatternFileName = ref(null)

// Colorpicker default values for patterns
const defaultPatternColors = [namedColors.blue_light, namedColors.yellow_light, namedColors.green_light]
const patternColors = ref([...defaultPatternColors])

// Store current colors for each section of the pattern
const patternSectionColors = ref({
  primary: patternColors.value[0],
  secondary: patternColors.value[1],
  tertiary: patternColors.value[2]
})

const defaultPatternSnapshot = ref(null)

// --- Functions ---

function handleCanvasTransformEnd({ index, event }) {
  const node = event.target
  const sx = node.scaleX()
  const sy = node.scaleY()
  const signX = sx < 0 ? -1 : 1
  const signY = sy < 0 ? -1 : 1
  const scaledWidth = Math.max(30, node.width() * Math.abs(sx))
  const scaledHeight = Math.max(30, node.height() * Math.abs(sy))
  const x = node.x()
  const y = node.y()

  canvasImages.value[index].width = scaledWidth
  canvasImages.value[index].height = scaledHeight
  canvasImages.value[index].rotation = node.rotation()
  canvasImages.value[index].x = x
  canvasImages.value[index].y = y
  canvasImages.value[index].centerX = x
  canvasImages.value[index].centerY = y
  canvasImages.value[index].scaleX = signX
  canvasImages.value[index].scaleY = signY
  node.scaleX(signX)
  node.scaleY(signY)

  const img = canvasImages.value[index]
  if (img.maskPrimary || img.maskSecondary || img.maskTertiary) {
    nextTick(() => applyEmblemMask(index))
  } else if (img.srcEl) {
    canvasImages.value[index].el = img.srcEl
    nextTick(() => cacheImageNode(index))
  }
}

function handleCanvasDragEnd({ index }) {
  const img = canvasImages.value[index]
  if (!img) return
  if (img.maskPrimary || img.maskSecondary || img.maskTertiary) {
    nextTick(() => applyEmblemMask(index))
  } else if (img.srcEl) {
    canvasImages.value[index].el = img.srcEl
    nextTick(() => cacheImageNode(index))
  }
}

function cacheImageNode(i) {
  const node = mainCanvasRef.value?.imageRefs?.[i]?.getNode?.()
  if (!node) return
  try {
    node.cache({ pixelRatio: 1 })
    node.drawHitFromCache(false)
    node.getLayer()?.batchDraw?.()
  } catch {
    // ignore cache errors
  }
}

function setPattern(patternEl, filename) {
  selectedPatternEl.value = patternEl
  originalPatternUrl.value = patternEl?.src || null
  selectedPatternFileName.value = filename
  // Record the first pattern as default snapshot
  if (!defaultPatternSnapshot.value && originalPatternUrl.value) {
    defaultPatternSnapshot.value = { url: originalPatternUrl.value, filename }
  }
  // Recolor the pattern with the current colors on each pattern change
  overridePatternAllColors()
}

function removeImage(i) {
  canvasImages.value.splice(i, 1)
  if (selectedIndex.value === i) {
    selectedIndex.value = null
  } else if (selectedIndex.value > i) {
    selectedIndex.value--
  }
}

function handleLayerClick(i, e) {
  selectedIndex.value = selectedIndex.value === i ? null : i
  if (e && e.stopPropagation) e.stopPropagation()
}

function onLayerDragStart(i) {
  draggedLayerIndex.value = i
}

function onLayerDrop(targetIdx) {
  const fromIdx = draggedLayerIndex.value
  if (fromIdx === null || fromIdx === targetIdx) return
  const arr = canvasImages.value
  const [moved] = arr.splice(fromIdx, 1)
  arr.splice(targetIdx, 0, moved)
  if (selectedIndex.value === fromIdx) {
    selectedIndex.value = targetIdx
  } else if (selectedIndex.value > fromIdx && selectedIndex.value <= targetIdx) {
    selectedIndex.value--
  } else if (selectedIndex.value < fromIdx && selectedIndex.value >= targetIdx) {
    selectedIndex.value++
  }
  draggedLayerIndex.value = null

  // re-normalize depths so renderList follows the array order (frontmost last)
  for (let i = 0; i < arr.length; i++) {
    arr[i].depth = (arr.length - 1) - i
  }
}

function copyExportToClipboard() {
  nextTick(() => {
    const textarea = document.querySelector('textarea[readonly]')
    if (textarea) {
      textarea.select()
      document.execCommand('copy')
    }
  })
}

function addImage(imgObj) {
  // Determine number of color to show based on assets/emblems.json
  const info = emblemsData[imgObj.filename]
  const colorCount = info?.colors ? Math.max(1, Math.min(3, info.colors)) : 1
  const defaultColors = ['#00008c', '#00ff80', '#ff008c']

  if (!imgObj.colors || !Array.isArray(imgObj.colors) || imgObj.colors.length !== colorCount) {
    imgObj.colors = defaultColors.slice(0, colorCount)
  }
  imgObj.maskPrimary = false
  imgObj.maskSecondary = false
  imgObj.maskTertiary = false
  // Keep a source version (unmasked) to reapply mask without quality loss
  imgObj.srcEl = imgObj.el
  // default depth
  if (typeof imgObj.depth !== 'number') imgObj.depth = 0
  // Add scaleX/scaleY
  imgObj.scaleX = typeof imgObj.scaleX === 'number' ? imgObj.scaleX : 1
  imgObj.scaleY = typeof imgObj.scaleY === 'number' ? imgObj.scaleY : 1
  canvasImages.value.push(imgObj)
}

function handleSidebarDrop(e) {
  e.preventDefault()
  const src = e.dataTransfer.getData('text/plain')
  if (!src) return
  let imgObj = null
  if (window.sidebarImages && Array.isArray(window.sidebarImages)) {
    imgObj = window.sidebarImages.find((img) => img.url === src)
  }
  if (!imgObj) return
  const rect = e.currentTarget.getBoundingClientRect()
  const width = 100
  const height = 100
  // Fix position to center emblem with offset
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  // Calculate initial center
  const centerX = x
  const centerY = y
  const newImage = {
    id: Date.now() + Math.random(),
    x: x,
    y: y,
    el: imgObj.imgEl,
    width,
    height,
    rotation: 0,
    filename: imgObj.filename,
    centerX: centerX,
    centerY: centerY,
    depth: 0,
  }
  addImage(newImage)
  // Automatically select the new element
  nextTick(() => {
    selectedIndex.value = canvasImages.value.length - 1
  })
}

// Add a function to recolor an emblem image according to its colors
// Warning : praying that everything works cause I don't wanna redo this
function recolorEmblemImage(imgEl, colors) {
  if (!imgEl) return imgEl
  const w = imgEl.width
  const h = imgEl.height
  if (!w || !h) return imgEl
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = w
  tempCanvas.height = h
  const ctx = tempCanvas.getContext('2d')
  if (!ctx) return imgEl
  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(imgEl, 0, 0, w, h)
  function hexToRgb(hex) {
    hex = hex.replace('#', '')
    if (hex.length === 3) hex = hex.split('').map(x => x + x).join('')
    const num = parseInt(hex, 16)
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
  }
  const imgData = ctx.getImageData(0, 0, w, h)
  const data = imgData.data
  const tolerance = 60
  const recolorings = [
    { src: '#00008c', dst: colors[0] || '#00008c' },
    { src: '#00ff80', dst: colors[1] || '#00ff80' },
    { src: '#ff008c', dst: colors[2] || '#ff008c' }
  ]
  for (const { src, dst } of recolorings) {
    const srcRgb = hexToRgb(src)
    const dstRgb = hexToRgb(dst)
    for (let i = 0; i < data.length; i += 4) {
      // Check if the pixel is within the tolerance of the reference color
      if (
        Math.abs(data[i] - srcRgb[0]) < tolerance &&
        Math.abs(data[i + 1] - srcRgb[1]) < tolerance &&
        Math.abs(data[i + 2] - srcRgb[2]) < tolerance
      ) {
        // Calculate the intensity difference relative to the reference color
        const srcLum = (srcRgb[0] + srcRgb[1] + srcRgb[2]) / 3
        const pxLum = (data[i] + data[i + 1] + data[i + 2]) / 3
        const lumRatio = srcLum === 0 ? 1 : pxLum / srcLum
        // Apply the same variation to the target color
        data[i] = Math.max(0, Math.min(255, dstRgb[0] * lumRatio))
        data[i + 1] = Math.max(0, Math.min(255, dstRgb[1] * lumRatio))
        data[i + 2] = Math.max(0, Math.min(255, dstRgb[2] * lumRatio))
      }
    }
  }
  ctx.putImageData(imgData, 0, 0)
  const newImg = new window.Image()
  newImg.src = tempCanvas.toDataURL()
  return newImg
}

function handleUpdateEmblemColor({ layerId, colors }) {
  const idx = canvasImages.value.findIndex(img => img.id === layerId)
  if (idx !== -1) {
    const emblem = canvasImages.value[idx]
    let baseImgEl = emblem.baseEl || emblem.el
    if (!emblem.baseEl) {
      baseImgEl = emblem.el
      canvasImages.value[idx].baseEl = baseImgEl
    }
    const newImg = recolorEmblemImage(baseImgEl, colors)
    newImg.onload = () => {
      canvasImages.value[idx].srcEl = newImg
      const hasMask =
        canvasImages.value[idx].maskPrimary ||
        canvasImages.value[idx].maskSecondary ||
        canvasImages.value[idx].maskTertiary
      if (hasMask) {
        nextTick(() => applyEmblemMask(idx))
      } else {
        // mutate only the concerned emblem
        emblem.el = newImg
        emblem.colors = [...colors]
        // removed object replacement and global array refresh
        nextTick(() => cacheImageNode(idx))
      }
    }
    if (newImg.complete) {
      newImg.onload()
    }
  }
}

function handleUpdateEmblemRotation({ layerId, rotation }) {
  const idx = canvasImages.value.findIndex(img => img.id === layerId)
  if (idx !== -1) {
    const node = mainCanvasRef.value?.imageRefs?.[idx]?.getNode?.()
    if (node) {
      node.rotation(rotation)
      handleCanvasTransformEnd({ index: idx, event: { target: node } })
    }
    const img = canvasImages.value[idx]
    if (img.maskPrimary || img.maskSecondary || img.maskTertiary) {
      nextTick(() => applyEmblemMask(idx))
    } else if (img.srcEl) {
      canvasImages.value[idx].el = img.srcEl
      // removed global array refresh
      nextTick(() => cacheImageNode(idx))
    }
  }
}

function handleSetEmblemPos({ layerId, x, y }) {
  const idx = canvasImages.value.findIndex(img => img.id === layerId)
  if (idx !== -1) {
    if (typeof x === 'number') {
      canvasImages.value[idx].x = x
    }
    if (typeof y === 'number') {
      canvasImages.value[idx].y = y
    }
    const img = canvasImages.value[idx]
    if (img.maskPrimary || img.maskSecondary || img.maskTertiary) {
      nextTick(() => applyEmblemMask(idx))
    } else if (img.srcEl) {
      canvasImages.value[idx].el = img.srcEl
      // removed global array refresh
      nextTick(() => cacheImageNode(idx))
    }
  }
}

function handleSetEmblemStretch({ layerId, stretchX, stretchY }) {
  const idx = canvasImages.value.findIndex(img => img.id === layerId)
  if (idx !== -1) {
    if (typeof stretchX === 'number') {
      canvasImages.value[idx].width = stretchX
    }
    if (typeof stretchY === 'number') {
      canvasImages.value[idx].height = stretchY
    }
    const img = canvasImages.value[idx]
    if (img.maskPrimary || img.maskSecondary || img.maskTertiary) {
      nextTick(() => applyEmblemMask(idx))
    } else if (img.srcEl) {
      canvasImages.value[idx].el = img.srcEl
      // removed global array refresh
      nextTick(() => cacheImageNode(idx))
    }
  }
}

function handleSetEmblemMask({ layerId, maskPrimary, maskSecondary, maskTertiary }) {
  const idx = canvasImages.value.findIndex(img => img.id === layerId)
  if (idx !== -1) {
    const img = canvasImages.value[idx]
    img.maskPrimary = !!maskPrimary
    img.maskSecondary = !!maskSecondary
    img.maskTertiary = !!maskTertiary
    const hasMask = img.maskPrimary || img.maskSecondary || img.maskTertiary
    if (hasMask) {
      nextTick(() => applyEmblemMask(idx))
    } else if (img.srcEl) {
      // No mask active anymore -> restore original source
      canvasImages.value[idx].el = img.srcEl
      // removed global array refresh
      nextTick(() => cacheImageNode(idx))
    }
  }
}

function handleFlipHorizontal({ layerId }) {
  const idx = canvasImages.value.findIndex(img => img.id === layerId)
  if (idx !== -1 && mainCanvasRef.value?.imageRefs?.[idx]?.getNode) {
    const node = mainCanvasRef.value.imageRefs[idx].getNode()
    // Flip around center to avoid offset shift
    node.offsetX(node.width() / 2)
    node.offsetY(node.height() / 2)
    node.scaleX(node.scaleX() * -1)
    // for Export/state
    canvasImages.value[idx].scaleX = (canvasImages.value[idx].scaleX ?? 1) * -1
  }
}

function handleFlipVertical({ layerId }) {
  const idx = canvasImages.value.findIndex(img => img.id === layerId)
  if (idx !== -1 && mainCanvasRef.value?.imageRefs?.[idx]?.getNode) {
    const node = mainCanvasRef.value.imageRefs[idx].getNode()
    // Flip around center to avoid offset shift
    node.offsetX(node.width() / 2)
    node.offsetY(node.height() / 2)
    node.scaleY(node.scaleY() * -1)
    // for Export/state
    canvasImages.value[idx].scaleY = (canvasImages.value[idx].scaleY ?? 1) * -1
  }
}

function applyEmblemMask(idx) {
  const emblem = canvasImages.value[idx]
  if (!emblem) return
  const hasMask = emblem.maskPrimary || emblem.maskSecondary || emblem.maskTertiary
  if (!hasMask) return

  // Source image not masked to use for recomposition
  const sourceImg = emblem.srcEl || emblem.el
  if (!sourceImg) return

  const patternImg = selectedPatternEl.value
  if (!patternImg) return

  const stageW = stageSize.width
  const stageH = stageSize.height
  const width = Math.max(1, Math.round(emblem.width))
  const height = Math.max(1, Math.round(emblem.height))
  const centerX = emblem.x
  const centerY = emblem.y
  const theta = (emblem.rotation || 0) * Math.PI / 180
  const cosT = Math.cos(theta)
  const sinT = Math.sin(theta)

  // Output canvas (masked emblem)
  const emblemCanvas = document.createElement('canvas')
  emblemCanvas.width = width
  emblemCanvas.height = height
  const ectx = emblemCanvas.getContext('2d', { willReadFrequently: true })
  if (!ectx) return

  // Draw the unmasked source without rotation (rotation will be applied by coordinate calculation)
  ectx.drawImage(sourceImg, 0, 0, width, height)
  const emblemImgData = ectx.getImageData(0, 0, width, height)
  const eData = emblemImgData.data

  // Pattern canvas (stage size), rendered once per application
  const patternCanvas = document.createElement('canvas')
  patternCanvas.width = stageW
  patternCanvas.height = stageH
  const pctx = patternCanvas.getContext('2d', { willReadFrequently: true })
  if (!pctx) return
  pctx.clearRect(0, 0, stageW, stageH)
  pctx.drawImage(patternImg, 0, 0, stageW, stageH)
  const pImgData = pctx.getImageData(0, 0, stageW, stageH)
  const pData = pImgData.data

  // Colors to mask
  const maskColors = []
  if (emblem.maskPrimary && patternColors.value[0]) maskColors.push(patternColors.value[0])
  if (emblem.maskSecondary && patternColors.value[1]) maskColors.push(patternColors.value[1])
  if (emblem.maskTertiary && patternColors.value[2]) maskColors.push(patternColors.value[2])

  const tolerance = 5
  function hexToRgb(hex) {
    hex = String(hex).replace('#', '')
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
    const n = parseInt(hex, 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const maskRGBs = maskColors.map(hexToRgb)

  // For each local pixel (ex,ey) of the emblem, find the world coordinate and test the pattern
  for (let ey = 0; ey < height; ey++) {
    const ly = ey - height / 2
    for (let ex = 0; ex < width; ex++) {
      const lx = ex - width / 2
      const rx = lx * cosT - ly * sinT
      const ry = lx * sinT + ly * cosT
      const worldX = Math.round(centerX + rx)
      const worldY = Math.round(centerY + ry)

      if (worldX < 0 || worldY < 0 || worldX >= stageW || worldY >= stageH) continue

      const pi = (worldY * stageW + worldX) << 2
      const pr = pData[pi]
      const pg = pData[pi + 1]
      const pb = pData[pi + 2]

      // Check for a match with one of the masked colors only
      let transparent = false
      for (let k = 0; k < maskRGBs.length; k++) {
        const [mr, mg, mb] = maskRGBs[k]
        if (
          Math.abs(pr - mr) <= tolerance &&
          Math.abs(pg - mg) <= tolerance &&
          Math.abs(pb - mb) <= tolerance
        ) {
          transparent = true
          break
        }
      }

      if (transparent) {
        const ei = (ey * width + ex) << 2
        eData[ei + 3] = 0 // alpha to 0
      }
    }
  }

  ectx.putImageData(emblemImgData, 0, 0)

  const maskedImg = new window.Image()
  maskedImg.src = emblemCanvas.toDataURL()
  maskedImg.onload = () => {
    canvasImages.value[idx].el = maskedImg
    // removed global array refresh
    nextTick(() => cacheImageNode(idx))
  }
  if (maskedImg.complete) maskedImg.onload()
}

// Add a function to override the primary color of the pattern
function overridePatternPrimaryColor(newColor) {
  patternSectionColors.value.primary = newColor
  patternColors.value[0] = newColor
  overridePatternAllColors()
}

// Add a function to override the secondary color of the pattern
function overridePatternSecondaryColor(newColor) {
  patternSectionColors.value.secondary = newColor
  patternColors.value[1] = newColor
  overridePatternAllColors()
}

// Add a function to override the tertiary color of the pattern
function overridePatternTertiaryColor(newColor) {
  patternSectionColors.value.tertiary = newColor
  patternColors.value[2] = newColor
  overridePatternAllColors()
}

function overridePatternAllColors() {
  if (!originalPatternUrl.value) return
  const img = new window.Image()
  img.src = originalPatternUrl.value
  img.onload = () => {
    const w = img.width
    const h = img.height
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = w
    tempCanvas.height = h
    const ctx = tempCanvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)

    function hexToRgb(hex) {
      hex = hex.replace('#', '')
      if (hex.length === 3) hex = hex.split('').map(x => x + x).join('')
      const num = parseInt(hex, 16)
      return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
    }
    const imgData = ctx.getImageData(0, 0, w, h)
    const data = imgData.data
    const tolerance = 10

    // List of recolorings to apply
    const recolorings = [
      { src: '#ff0000', dst: patternSectionColors.value.primary },
      { src: '#ffff00', dst: patternSectionColors.value.secondary },
      { src: '#ffffff', dst: patternSectionColors.value.tertiary }
    ]

    for (const { src, dst } of recolorings) {
      const srcRgb = hexToRgb(src)
      const dstRgb = hexToRgb(dst)
      for (let i = 0; i < data.length; i += 4) {
        if (
          Math.abs(data[i] - srcRgb[0]) < tolerance &&
          Math.abs(data[i + 1] - srcRgb[1]) < tolerance &&
          Math.abs(data[i + 2] - srcRgb[2]) < tolerance
        ) {
          data[i] = dstRgb[0]
          data[i + 1] = dstRgb[1]
          data[i + 2] = dstRgb[2]
        }
      }
    }
    ctx.putImageData(imgData, 0, 0)
    const newImg = new window.Image()
    newImg.src = tempCanvas.toDataURL()
    selectedPatternEl.value = newImg
  }
}

// --- Lifecycle ---

onMounted(() => {
  // Recolor the pattern with the default colors as soon as the page loads
  overridePatternAllColors()
  window.addEventListener('keydown', onKeyDown)
  nextTick(() => updateMiniatureImage())
})

function isCanvasFocused() {
  // Check if no input or textarea is active OR if the focus is on the canvas
  const active = document.activeElement
  if (!active) return true
  const tag = active.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'textarea') return false
  // Optional: check if the canvas is active (by id or class if needed)
  return true
}

function onKeyDown(e) {
  if (!isCanvasFocused()) return
  if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
    if (selectedIndex.value !== null && canvasImages.value[selectedIndex.value]) {
      copiedImage = { ...canvasImages.value[selectedIndex.value] }
      if (copiedImage.colors) {
        copiedImage.colors = [...copiedImage.colors]
      }
    }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
    if (copiedImage) {
      e.preventDefault()
      // Use the instrumented version to paste + trace performance
      pasteCopiedImageWithPerf()
    }
  }
}

const miniatureImage = ref(null)

// Lightweight deps for miniature updates (avoid deep traversal of HTMLImageElement)
const miniatureDeps = computed(() => {
  return canvasImages.value.map(i => [
    i.id, i.x, i.y, i.width, i.height, i.rotation,
    i.scaleX, i.scaleY, i.depth,
    i.maskPrimary ? 1 : 0, i.maskSecondary ? 1 : 0, i.maskTertiary ? 1 : 0,
    i.el?.src || ''
  ]).flat()
})

watch(miniatureDeps, () => {
  nextTick(() => updateMiniatureImage())
})

function updateMiniatureImage() {
  nextTick(() => {
    if (mainCanvasRef.value?.updateMiniature) {
      const dataUrl = mainCanvasRef.value.updateMiniature()
      if (dataUrl) {
        miniatureImage.value = dataUrl
      }
    }
  })
}

function recomputeAllMasks() {
  canvasImages.value.forEach((img, idx) => {
    if (img.maskPrimary || img.maskSecondary || img.maskTertiary) {
      applyEmblemMask(idx)
    } else if (img.srcEl) {
      // restore unmasked image if no mask is active
      canvasImages.value[idx].el = img.srcEl
      nextTick(() => cacheImageNode(idx))
    }
  })
}

// Keep a single centralized recompute after the pattern bitmap actually changes
watch(selectedPatternEl, (val) => {
  if (val) {
    val.onload = () => {
      nextTick(() => {
        updateMiniatureImage()
        recomputeAllMasks()
      })
    }
    if (val.complete) {
      nextTick(() => {
        updateMiniatureImage()
        recomputeAllMasks()
      })
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
})

function handleImportData({ patternFileName, patternColors: pColors, emblems }) {
  isImporting.value = true

  // 1) Apply imported colors first
  if (Array.isArray(pColors) && pColors.length) {
    const p1 = pColors[0] ?? patternColors.value[0]
    const p2 = pColors[1] ?? patternColors.value[1]
    const p3 = pColors[2] ?? patternColors.value[2]
    patternColors.value = [p1, p2, p3]
    patternSectionColors.value = { primary: p1, secondary: p2, tertiary: p3 }
  }

  // 2) Load pattern and emblems in parallel
  let patternPromise = Promise.resolve(null)
  if (patternFileName) {
    patternPromise = new Promise(resolve => {
      const patUrl = import.meta.env.BASE_URL + `coat_of_arms/patterns/${patternFileName}`
      const patImg = new window.Image()
      patImg.src = patUrl
      patImg.onload = () => resolve(patImg)
      patImg.onerror = () => {
        notify({
          title: $t('import_error_title'),
          text: $t('import_error_text') + ' ' + $t('import_error_pattern_not_found', [patternFileName]),
          type: "error",
        duration: 5000
      })
      isImporting.value = false;
      resolve(null)
    }
      if (patImg.complete) resolve(patImg)
    })
  }

  const emblemsToLoad = emblems || []
  const emblemPromises = emblemsToLoad.map(e => new Promise(resolve => {
    const baseUrl = import.meta.env.BASE_URL + `coat_of_arms/colored_emblems/${e.filename}`
    const baseEl = new window.Image()
    baseEl.src = baseUrl
    baseEl.onload = () => resolve({ baseEl, e })
    baseEl.onerror = () => {
      notify({
        title: $t('import_error_title'),
        text: $t('import_error_text') + ' ' + $t('import_error_emblem_not_found', [e.filename]),
        type: "error",
        duration: 5000
      })
      isImporting.value = false;
      resolve(null)
    }
    if (baseEl.complete) resolve({ baseEl, e })
  }))

  Promise.all([patternPromise, ...emblemPromises]).then(async results => {
    // 3) Apply the loaded pattern
    const patImg = results[0]
    if (patImg) {
      setPattern(patImg, patternFileName)
      // recoloration of the pattern (overridePatternAllColors) already called in setPattern
      await new Promise(r => setTimeout(r, 0)) // wait for recoloring
    }

    // 4) Prepare all recolored emblems
    const loadedEmblems = []
    for (let i = 1; i < results.length; i++) {
      const { baseEl, e } = results[i]
      // recoloration
      const colored = recolorEmblemImage(baseEl, e.colors || [])
      await new Promise(res => {
        if (colored.complete) res()
        else colored.onload = res
      })
      loadedEmblems.push({
        id: Date.now() + Math.random(),
        filename: e.filename,
        el: colored,
        srcEl: colored,
        baseEl,
        colors: e.colors || [],
        x: e.x,
        y: e.y,
        width: e.width,
        height: e.height,
        rotation: e.rotation || 0,
        centerX: e.x,
        centerY: e.y,
        maskPrimary: !!e.maskPrimary,
        maskSecondary: !!e.maskSecondary,
        maskTertiary: !!e.maskTertiary,
        depth: typeof e.depth === 'number' ? e.depth : 0,
        scaleX: e.scaleX,
        scaleY: e.scaleY
      })
    }

    // 5) Sort and normalize layers
    loadedEmblems.sort((a, b) => Number(b.depth ?? 0) - Number(a.depth ?? 0))
    for (let i = 0; i < loadedEmblems.length; i++) {
      loadedEmblems[i].depth = (loadedEmblems.length - 1) - i
    }

    // 6) Update state all at once
    canvasImages.value = loadedEmblems

    // 7) Apply all masks in one go
    await nextTick()
    for (let i = 0; i < canvasImages.value.length; i++) {
      const img = canvasImages.value[i]
      if (img.maskPrimary || img.maskSecondary || img.maskTertiary) {
        await new Promise(res => {
          applyEmblemMask(i)
          // wait for the masked image to load
          const check = () => {
            if (canvasImages.value[i].el?.complete) res()
            else setTimeout(check, 10)
          }
          check()
        })
      }
    }

    // 8) End of import
    isImporting.value = false
  })
}

function confirmResetEmblem() {
  // close modal
  showResetModal.value = false

  // clear selection and layers
  selectedIndex.value = null
  canvasImages.value = []

  // restore default pattern colors
  patternColors.value = [...defaultPatternColors]
  patternSectionColors.value = {
    primary: defaultPatternColors[0],
    secondary: defaultPatternColors[1],
    tertiary: defaultPatternColors[2],
  }

  // restore the default pattern (first one used) if we have a snapshot
  if (defaultPatternSnapshot.value?.url) {
    const base = new window.Image()
    base.src = defaultPatternSnapshot.value.url
    base.onload = () => {
      setPattern(base, defaultPatternSnapshot.value.filename)
      // setPattern will recolor using current (now default) colors
      nextTick(() => updateMiniatureImage())
    }
    if (base.complete) {
      setPattern(base, defaultPatternSnapshot.value.filename)
      nextTick(() => updateMiniatureImage())
    }
  } else {
    // fallback: recolor current pattern (if any) with defaults
    overridePatternAllColors()
    nextTick(() => updateMiniatureImage())
  }
}

// Clone emblem by copy-pasting
function pasteCopiedImageWithPerf() {
  if (!copiedImage) return

  const src = copiedImage

  const clone = {
    ...src,
    id: Date.now() + Math.random(),
    x: (src.x ?? 0),
    y: (src.y ?? 0),
    centerX: (src.x ?? 0),
    centerY: (src.y ?? 0),
    rotation: src.rotation || 0,
    width: src.width,
    height: src.height,
    scaleX: src.scaleX ?? 1,
    scaleY: src.scaleY ?? 1,
    colors: src.colors ? [...src.colors] : undefined,
    el: src.srcEl || src.el,
    srcEl: src.srcEl || src.el,
    baseEl: src.baseEl || undefined,
    maskPrimary: !!src.maskPrimary,
    maskSecondary: !!src.maskSecondary,
    maskTertiary: !!src.maskTertiary,
    depth: typeof src.depth === 'number' ? src.depth : 0,
  }

  canvasImages.value.push(clone)
  selectedIndex.value = canvasImages.value.length - 1

  nextTick(() => {
    const i = selectedIndex.value
    const img = canvasImages.value[i]
    if (!img) return
    if (img.maskPrimary || img.maskSecondary || img.maskTertiary) {
      applyEmblemMask(i)
    } else {
      cacheImageNode(i)
    }
  })
}
</script>

<style scoped>
.app-root {
  height: 100vh;
  padding: 0;
  overflow: hidden;
}

/* Chrome, Edge, Safari */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #eaeaea;
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: #666;
}

/* Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: #eaeaea transparent;
}

.app-row {
  height: 100vh;
}
.sidebar-left {
  border-right: 1px solid #ccc;
  padding: 10px;
  overflow-y: auto;
}
.sidebar-right {
  border-left: 1px solid #ccc;
  padding: 10px;
  height: 100vh;
  overflow-y: auto;
}

.canvas-center {
  background: #eee;
  height: 100vh;
  position: relative;
}

/* Reset confirmation modal */
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.25);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-dialog {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 24px #0003;
  min-width: 320px;
  max-width: 90vw;
}
.modal-content {
  padding: 18px 24px;
}
.modal-header {
  font-size: 1.2em;
  font-weight: 600;
  margin-bottom: 8px;
}
.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 18px;
}
.btn {
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
}
.btn-danger {
  background: #e74c3c;
  color: #fff;
}
.btn-secondary {
  background: #eee;
  color: #333;
}

/* Block interface during import */
.import-blocker {
  position: fixed;
  z-index: 3000;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255,255,255,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}
.import-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}
.import-text {
  font-size: 1.3em;
  color: #ccb115;
  font-weight: 500;
}
</style>
