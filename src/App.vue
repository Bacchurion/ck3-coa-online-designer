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
        <!-- ExportData bouton en haut à gauche, hors du flux du canvas -->
        <div class="toolbar-row">
          <ExportData
            :patternFileName="selectedPatternFileName"
            :patternColors="patternColors"
            :emblems="canvasImages"
            :canvas-size="stageSize"
          />
          <ImportData
            :canvas-size="stageSize"
            @import-data="handleImportData"
          />
          <!-- Nouveau bouton reset -->
          <button
            @click="showResetModal = true"
            class="btn btn-outline-danger"
            title="Réinitialiser l'emblème"
          >
            <i class="bi bi-arrow-counterclockwise icon-left-gap"></i>
            {{ $t('reset_emblem') }}
          </button>
          <!-- Language switcher -->
          <div class="lang-switcher">
            <button
              class="btn btn-outline-info"
              @click="showLangMenu = !showLangMenu"
              title="Change language"
            >
              <span class="lang-flag">{{ getFlag(locale) }}</span>
            </button>
            <div v-if="showLangMenu" class="lang-menu">
              <button
                v-for="l in filteredLanguages"
                :key="l.code"
                class="lang-menu-item"
                @click="locale = l.code; showLangMenu = false"
                :title="l.label"
              >
                <span class="lang-flag">{{ l.flag }}</span>
                <span class="lang-label">{{ l.label }}</span>
              </button>
            </div>
          </div>
        </div>
        <div class="canvas-box d-flex align-items-center justify-content-center"
             @dragover.prevent="onCanvasDragOver"
             @drop="handleSidebarDrop">
          <v-stage ref="stageRef" :config="stageSize"
                   @mousedown="onStageMouseDown"
                   @mousemove="onStageMouseMove"
                   @mouseup="onStageMouseUp">
            <!-- pattern layer -->
            <v-layer ref="patternLayerRef" :config="{ listening: false, hitGraphEnabled: false }">
              <v-image
                v-if="selectedPatternEl"
                :config="{
                  x: 0,
                  y: 0,
                  image: selectedPatternEl,
                  width: canvasSize,
                  height: canvasSize,
                  listening: false,
                }"
              />
            </v-layer>

            <!-- images layer -->
            <v-layer ref="layerRef" :config="{ listening: false, hitGraphEnabled: false }">
              <v-image
                v-for="({ img, idx }) in renderList"
                :key="img.id"
                :id="img.id.toString()"
                :x="img.x"
                :y="img.y"
                :image="img.el"
                :width="img.width"
                :height="img.height"
                :rotation="img.rotation"
                :offsetX="img.width / 2"
                :offsetY="img.height / 2"
                :scaleX="img.scaleX ?? 1"
                :scaleY="img.scaleY ?? 1"
                :listening="false"
                :perfectDrawEnabled="false"
                :shadowForStrokeEnabled="false"
                @transformend="onTransformEnd(idx, $event)"
                :ref="(el) => setImageRef(idx, el)"
                @dragend="onImageDragEnd(idx, $event)"
              />
            </v-layer>

            <!-- UI layer for transformer (unchanged) -->
            <v-layer ref="uiLayerRef">
              <v-transformer
                v-if="selectedIndex !== null && imageRefs[selectedIndex]"
                ref="transformerRef"
                :config="{
                  nodes: [imageRefs[selectedIndex].getNode()],
                  rotateEnabled: true,
                  resizeEnabled: true,
                  enabledAnchors: [
                    'top-left',
                    'top-center',
                    'top-right',
                    'middle-right',
                    'middle-left',
                    'bottom-left',
                    'bottom-center',
                    'bottom-right',
                  ],
                  boundBoxFunc: limitBox,
                }"
              />
            </v-layer>
          </v-stage>
        </div>
        <!-- Preview non interactive -->
        <PreviewCanvas
          :preview-image="miniatureImage"
          :canvas-size="stageSize"
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

  <!-- Modale de confirmation reset -->
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
import ExportData from './components/ExportData.vue'
import LayersPanel from './components/LayersPanel.vue'
import PreviewCanvas from './components/PreviewCanvas.vue'
import ImportData from './components/ImportData.vue'
import emblemsData from './assets/emblems.json'
import Konva from 'konva'

// Lower rendering resolution on HiDPI to speed up draws
Konva.pixelRatio = 1

const canvasImages = ref([]) // [{...}]
const canvasSize = ref(400)
const stageSize = { width: canvasSize.value, height: canvasSize.value }
const selectedIndex = ref(null)
const imageRefs = ref([])
const selectedPatternEl = ref(null)
const draggedLayerIndex = ref(null)
const stageRef = ref(null)
// add missing layer ref so we can hook Konva draw events
const layerRef = ref(null)
// NEW: split layers
const patternLayerRef = ref(null)
const uiLayerRef = ref(null)
// NEW: ref to the Transformer to avoid extra reactive renders during snapshot
const transformerRef = ref(null)
const showLangMenu = ref(false)
// Languages list (extendable)
const languages = ref([
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
])
const { locale } = useI18n()
const filteredLanguages = computed(() => languages.value.filter(l => l.code !== String(locale.value)))
function getFlag(code) {
  const l = languages.value.find(x => x.code === String(code))
  return l ? l.flag : '🌐'
}

const showResetModal = ref(false)
const isImporting = ref(false)
let copiedImage = null

// Stocke l'URL originale du pattern pour toujours repartir de l'image source
const originalPatternUrl = ref(null)
const selectedPatternFileName = ref(null)

// Valeurs par défaut pour les colorpickers du pattern
const defaultPatternColors = ['#2a5d8c', '#ffad33', '#336638']
const patternColors = ref([...defaultPatternColors])

// Stocke les couleurs courantes pour chaque section
const patternSectionColors = ref({
  primary: patternColors.value[0],
  secondary: patternColors.value[1],
  tertiary: patternColors.value[2]
})

// NEW: keep track of the first pattern as the app default
const defaultPatternSnapshot = ref(null)

// --- Functions ---

function setImageRef(i, el) {
  imageRefs.value[i] = el
  // Cache node once mounted for faster redraws
  nextTick(() => cacheImageNode(i))
}

// Cache a single image node (safe to call multiple times)
function cacheImageNode(i) {
  const node = imageRefs.value[i]?.getNode?.()
  if (!node) return
  try {
    // Cache at 1x to limit memory; we don't need hit cache
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
  // NEW: record the first pattern as default snapshot
  if (!defaultPatternSnapshot.value && originalPatternUrl.value) {
    defaultPatternSnapshot.value = { url: originalPatternUrl.value, filename }
  }
  // Recolorie le pattern avec les couleurs courantes à chaque changement de pattern
  overridePatternAllColors()
}

function limitBox(oldBox, newBox) {
  if (newBox.width < 30 || newBox.height < 30) return oldBox
  return newBox
}

function onTransformEnd(i, e) {
  const node = e.target
  // preserve flip sign while baking scale into width/height
  const sx = node.scaleX()
  const sy = node.scaleY()
  const signX = sx < 0 ? -1 : 1
  const signY = sy < 0 ? -1 : 1
  const scaledWidth = Math.max(30, node.width() * Math.abs(sx))
  const scaledHeight = Math.max(30, node.height() * Math.abs(sy))
  const x = node.x()
  const y = node.y()

  canvasImages.value[i].width = scaledWidth
  canvasImages.value[i].height = scaledHeight
  canvasImages.value[i].rotation = node.rotation()
  canvasImages.value[i].x = x
  canvasImages.value[i].y = y
  canvasImages.value[i].centerX = x
  canvasImages.value[i].centerY = y
  // keep flip after resize; scale magnitude baked into width/height
  canvasImages.value[i].scaleX = signX
  canvasImages.value[i].scaleY = signY
  node.scaleX(signX)
  node.scaleY(signY)

  // Recompute mask after resize/rotate (transformer)
  const img = canvasImages.value[i]
  if (img.maskPrimary || img.maskSecondary || img.maskTertiary) {
    nextTick(() => applyEmblemMask(i))
  } else if (img.srcEl) {
    // ensure we display the unmasked source if no mask is active
    canvasImages.value[i].el = img.srcEl
    nextTick(() => cacheImageNode(i))
  }
}

function removeImage(i) {
  canvasImages.value.splice(i, 1)
  imageRefs.value.splice(i, 1)
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

  // NEW: re-normalize depths so renderList follows the array order (frontmost last)
  for (let i = 0; i < arr.length; i++) {
    arr[i].depth = (arr.length - 1) - i
  }
}

function onImageDragEnd(i, e) {
  const node = e.target
  const scaledWidth = node.width() * node.scaleX()
  const scaledHeight = node.height() * node.scaleY()
  const absCenter = node.getAbsoluteTransform().point({
    x: scaledWidth / 2,
    y: scaledHeight / 2,
  })
  canvasImages.value[i].x = node.x()
  canvasImages.value[i].y = node.y()
  canvasImages.value[i].centerX = absCenter.x
  canvasImages.value[i].centerY = absCenter.y
  // Recompute mask after drag
  const img = canvasImages.value[i]
  if (img.maskPrimary || img.maskSecondary || img.maskTertiary) {
    nextTick(() => applyEmblemMask(i))
  } else if (img.srcEl) {
    canvasImages.value[i].el = img.srcEl
    nextTick(() => cacheImageNode(i))
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
  // Détermine le nombre de couleurs par défaut selon assets/emblems.json
  const info = emblemsData[imgObj.filename]
  const colorCount = info?.colors ? Math.max(1, Math.min(3, info.colors)) : 1
  const defaultColors = ['#00008c', '#00ff80', '#ff008c']

  if (!imgObj.colors || !Array.isArray(imgObj.colors) || imgObj.colors.length !== colorCount) {
    imgObj.colors = defaultColors.slice(0, colorCount)
  }
  imgObj.maskPrimary = false
  imgObj.maskSecondary = false
  imgObj.maskTertiary = false
  // conserve une version source (non masquée) pour recomposer le masque sans perte
  imgObj.srcEl = imgObj.el
  // profondeur par défaut
  if (typeof imgObj.depth !== 'number') imgObj.depth = 0
  // Ajout scaleX/scaleY
  imgObj.scaleX = typeof imgObj.scaleX === 'number' ? imgObj.scaleX : 1
  imgObj.scaleY = typeof imgObj.scaleY === 'number' ? imgObj.scaleY : 1
  canvasImages.value.push(imgObj)
}

function onCanvasDragOver(e) {
  // Permet le drop sur le canvas (sinon certains navigateurs ignorent l'événement drop)
  e.preventDefault()
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
  // Corrige la position pour centrer l'emblème avec offset
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  // Calcule le centre initial
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
    depth: 0, // par défaut
  }
  addImage(newImage)
  // Sélectionne automatiquement le nouvel élément
  nextTick(() => {
    selectedIndex.value = canvasImages.value.length - 1
  })
}

// Liste de rendu triée par profondeur (depth desc -> dessiné d'abord, donc derrière)
const renderList = computed(() => {
  const list = canvasImages.value
    .map((img, idx) => ({ img, idx }))
    .sort((a, b) => {
      const da = Number(a.img.depth ?? 0)
      const db = Number(b.img.depth ?? 0)
      if (db !== da) return db - da
      return a.idx - b.idx
    })
  return list
})

// NEW: precise hit-test selection without Konva hit graph
function isPointInEmblem(img, px, py) {
  const cx = img.x
  const cy = img.y
  const theta = (img.rotation || 0) * Math.PI / 180
  const cosT = Math.cos(theta)
  const sinT = Math.sin(theta)
  const sx = Math.abs(img.scaleX ?? 1)
  const sy = Math.abs(img.scaleY ?? 1)
  const halfW = (img.width * sx) / 2
  const halfH = (img.height * sy) / 2

  const dx = px - cx
  const dy = py - cy
  const lx = dx * cosT + dy * sinT
  const ly = -dx * sinT + dy * cosT

  return Math.abs(lx) <= halfW && Math.abs(ly) <= halfH
}

const dragState = ref({ idx: null, startX: 0, startY: 0, imgStartX: 0, imgStartY: 0 })

function onStageMouseDown(e) {
  // Ignore clicks on transformer or its anchors -> let Konva handle resize/rotate
  if (isTransformerTarget(e?.target)) return

  const stage = stageRef.value?.getNode?.()
  if (!stage) return
  const pos = stage.getPointerPosition()
  if (!pos) return

  // If click is inside the currently selected emblem, drag it regardless of stacking
  const current = selectedIndex.value
  let picked = null
  if (current !== null) {
    const selImg = canvasImages.value[current]
    if (selImg && isPointInEmblem(selImg, pos.x, pos.y)) {
      picked = current
    }
  }

  // Otherwise, pick top-most under cursor and update selection
  if (picked === null) {
    const list = renderList.value
    for (let i = list.length - 1; i >= 0; i--) {
      const { img, idx } = list[i]
      if (isPointInEmblem(img, pos.x, pos.y)) {
        picked = idx
        break
      }
    }
    selectedIndex.value = picked === null ? null : picked
  }

  // Begin manual drag only if an emblem was picked (left button)
  if (picked !== null && (!e?.evt || e.evt.button === 0)) {
    const img = canvasImages.value[picked]
    dragState.value = {
      idx: picked,
      startX: pos.x,
      startY: pos.y,
      imgStartX: img.x,
      imgStartY: img.y
    }
  }
}

function onStageMouseMove() {
  const stage = stageRef.value?.getNode?.()
  if (!stage) return
  const ds = dragState.value
  if (ds.idx === null) return
  const pos = stage.getPointerPosition()
  if (!pos) return

  const dx = pos.x - ds.startX
  const dy = pos.y - ds.startY
  const i = ds.idx
  const img = canvasImages.value[i]
  img.x = ds.imgStartX + dx
  img.y = ds.imgStartY + dy
  img.centerX = img.x
  img.centerY = img.y
}

function onStageMouseUp() {
  const ds = dragState.value
  if (ds.idx === null) return
  const i = ds.idx
  dragState.value = { idx: null, startX: 0, startY: 0, imgStartX: 0, imgStartY: 0 }

  const img = canvasImages.value[i]
  if (!img) return
  if (img.maskPrimary || img.maskSecondary || img.maskTertiary) {
    nextTick(() => applyEmblemMask(i))
  } else if (img.srcEl) {
    canvasImages.value[i].el = img.srcEl
    nextTick(() => cacheImageNode(i))
  }
}

// Ajoute une fonction pour recolorier une image emblème selon ses couleurs
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
      // Vérifie si le pixel est dans la tolérance de la couleur de référence
      if (
        Math.abs(data[i] - srcRgb[0]) < tolerance &&
        Math.abs(data[i + 1] - srcRgb[1]) < tolerance &&
        Math.abs(data[i + 2] - srcRgb[2]) < tolerance
      ) {
        // Calcule la différence d'intensité par rapport à la couleur de référence
        const srcLum = (srcRgb[0] + srcRgb[1] + srcRgb[2]) / 3
        const pxLum = (data[i] + data[i + 1] + data[i + 2]) / 3
        const lumRatio = srcLum === 0 ? 1 : pxLum / srcLum
        // Applique la même variation à la couleur cible
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
    const node = imageRefs.value[idx]?.getNode?.()
    if (node) {
      node.rotation(rotation)
      onTransformEnd(idx, { target: node })
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
  if (idx !== -1 && imageRefs.value[idx]?.getNode) {
    const node = imageRefs.value[idx].getNode()
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
  if (idx !== -1 && imageRefs.value[idx]?.getNode) {
    const node = imageRefs.value[idx].getNode()
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

  // image source non masquée à utiliser pour recomposition
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

  // canvas de sortie (emblème masqué)
  const emblemCanvas = document.createElement('canvas')
  emblemCanvas.width = width
  emblemCanvas.height = height
  const ectx = emblemCanvas.getContext('2d', { willReadFrequently: true })
  if (!ectx) return

  // dessine la source non masquée sans rotation (on appliquera la rotation par calcul de coordonnées)
  ectx.drawImage(sourceImg, 0, 0, width, height)
  const emblemImgData = ectx.getImageData(0, 0, width, height)
  const eData = emblemImgData.data

  // canvas du pattern (taille du stage), rendu 1 fois par application
  const patternCanvas = document.createElement('canvas')
  patternCanvas.width = stageW
  patternCanvas.height = stageH
  const pctx = patternCanvas.getContext('2d', { willReadFrequently: true })
  if (!pctx) return
  pctx.clearRect(0, 0, stageW, stageH)
  pctx.drawImage(patternImg, 0, 0, stageW, stageH)
  const pImgData = pctx.getImageData(0, 0, stageW, stageH)
  const pData = pImgData.data

  // couleurs à masquer
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

  // pour chaque pixel local (ex,ey) de l'emblème, trouve la coordonnée monde et teste le pattern
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

      // test de correspondance avec l'une des couleurs masquées uniquement
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
        eData[ei + 3] = 0 // alpha à 0
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

// Ajoute une fonction pour override la couleur primaire du pattern
function overridePatternPrimaryColor(newColor) {
  patternSectionColors.value.primary = newColor
  patternColors.value[0] = newColor
  overridePatternAllColors()
}

// Ajoute une fonction pour override la couleur secondaire du pattern
function overridePatternSecondaryColor(newColor) {
  patternSectionColors.value.secondary = newColor
  patternColors.value[1] = newColor
  overridePatternAllColors()
}

// Ajoute une fonction pour override la couleur tertiaire du pattern
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

    // Liste des recolorings à appliquer
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
  // Recolorie le pattern avec les couleurs par défaut dès l'arrivée sur la page
  overridePatternAllColors()
  window.addEventListener('keydown', onKeyDown)
  nextTick(() => updateMiniatureImage())
})

function isCanvasFocused() {
  // Vérifie si aucun input ou textarea n'est actif OU si le focus est sur le canvas
  const active = document.activeElement
  if (!active) return true
  const tag = active.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'textarea') return false
  // Optionnel : vérifie si le canvas est actif (par id ou classe si besoin)
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
      // Utilise la version instrumentée pour coller + tracer les perfs
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

// REPLACE the deep watcher:
// watch([canvasImages], () => { nextTick(() => updateMiniatureImage()) }, { deep: true })
watch(miniatureDeps, () => {
  nextTick(() => updateMiniatureImage())
})

function updateMiniatureImage() {
  // Do not toggle selectedIndex; hide the Transformer imperatively to avoid an extra render
  nextTick(() => {
    const stage = stageRef.value?.getNode?.()
    if (stage) {
      const trNode = transformerRef.value?.getNode?.()
      let prevVisible
      if (trNode && typeof trNode.visible === 'function') {
        prevVisible = trNode.visible()
        trNode.visible(false)
        stage.batchDraw()
      }

      // Simplified snapshot without perf metrics
      const canvas = stage.toCanvas()
      const dataUrl = canvas.toDataURL()
      miniatureImage.value = dataUrl

      if (trNode && typeof trNode.visible === 'function') {
        trNode.visible(prevVisible)
        stage.batchDraw()
      }
    }
  })
}

// Met à jour la miniature à chaque changement du canevas principal
// REMOVE the deep watch which reintroduced heavy traversal
// watch([canvasImages], () => {
//   nextTick(() => updateMiniatureImage())
// }, { deep: true })

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
  // removed global array refresh
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

  // 1) Applique d'abord les couleurs importées
  if (Array.isArray(pColors) && pColors.length) {
    const p1 = pColors[0] ?? patternColors.value[0]
    const p2 = pColors[1] ?? patternColors.value[1]
    const p3 = pColors[2] ?? patternColors.value[2]
    patternColors.value = [p1, p2, p3]
    patternSectionColors.value = { primary: p1, secondary: p2, tertiary: p3 }
  }

  // 2) Charge pattern et emblèmes en parallèle
  let patternPromise = Promise.resolve(null)
  if (patternFileName) {
    patternPromise = new Promise(resolve => {
      const patUrl = import.meta.env.BASE_URL + `coat_of_arms/patterns/${patternFileName}`
      const patImg = new window.Image()
      patImg.src = patUrl
      patImg.onload = () => resolve(patImg)
      if (patImg.complete) resolve(patImg)
    })
  }

  const emblemsToLoad = emblems || []
  const emblemPromises = emblemsToLoad.map(e => new Promise(resolve => {
    const baseUrl = import.meta.env.BASE_URL + `coat_of_arms/colored_emblems/${e.filename}`
    const baseEl = new window.Image()
    baseEl.src = baseUrl
    baseEl.onload = () => resolve({ baseEl, e })
    if (baseEl.complete) resolve({ baseEl, e })
  }))

  Promise.all([patternPromise, ...emblemPromises]).then(async results => {
    // 3) Applique le pattern chargé
    const patImg = results[0]
    if (patImg) {
      setPattern(patImg, patternFileName)
      // recoloration du pattern (overridePatternAllColors) déjà appelée dans setPattern
      await new Promise(r => setTimeout(r, 0)) // attend le recoloring
    }

    // 4) Prépare tous les emblèmes recolorés
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

    // 5) Trie et normalise les layers
    loadedEmblems.sort((a, b) => Number(b.depth ?? 0) - Number(a.depth ?? 0))
    for (let i = 0; i < loadedEmblems.length; i++) {
      loadedEmblems[i].depth = (loadedEmblems.length - 1) - i
    }

    // 6) Met à jour le state en une fois
    canvasImages.value = loadedEmblems

    // 7) Applique tous les masques en une seule passe
    await nextTick()
    for (let i = 0; i < canvasImages.value.length; i++) {
      const img = canvasImages.value[i]
      if (img.maskPrimary || img.maskSecondary || img.maskTertiary) {
        await new Promise(res => {
          applyEmblemMask(i)
          // attend que l'image masquée soit chargée
          const check = () => {
            if (canvasImages.value[i].el?.complete) res()
            else setTimeout(check, 10)
          }
          check()
        })
      }
    }

    // 8) Fin de l'import
    isImporting.value = false
  })
}

function confirmResetEmblem() {
  // close modal
  showResetModal.value = false

  // clear selection and layers
  selectedIndex.value = null
  canvasImages.value = []
  imageRefs.value = []

  // restore default pattern colors
  patternColors.value = [...defaultPatternColors]
  patternSectionColors.value = {
    primary: defaultPatternColors[0],
    secondary: defaultPatternColors[1],
    tertiary: defaultPatternColors[2],
  }

  // NEW: restore the default pattern (first one used) if we have a snapshot
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

function pasteCopiedImageWithPerf() {
  if (!copiedImage) return

  const src = copiedImage
  const offset = 12

  // Clone emblem (no perf metrics)
  const clone = {
    ...src,
    id: Date.now() + Math.random(),
    x: (src.x ?? 0) + offset,
    y: (src.y ?? 0) + offset,
    centerX: (src.x ?? 0) + offset,
    centerY: (src.y ?? 0) + offset,
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

// NEW: helper to detect clicks on the Transformer or its anchors
function isTransformerTarget(konvaTarget) {
  const tr = transformerRef.value?.getNode?.()
  if (!tr || !konvaTarget) return false
  if (konvaTarget === tr) return true
  // anchors are children of the transformer
  if (typeof tr.isAncestorOf === 'function' && tr.isAncestorOf(konvaTarget)) return true
  // also handle ancestor chain manually if needed
  let p = konvaTarget.getParent?.()
  while (p) {
    if (p === tr) return true
    p = p.getParent?.()
  }
  return false
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
  height: 100vh;
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

.toolbar-row {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}
.lang-switcher {
  margin-left: auto;
  position: relative;
}
.lang-flag {
  font-size: 20px;
  line-height: 1;
}
.lang-menu {
  position: absolute;
  top: 36px;
  left: 0;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 8px #0002;
  min-width: 140px;
  z-index: 100;
}
.lang-menu-item {
  background: none;
  border: none;
  width: 100%;
  padding: 6px 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}
.lang-menu-item:hover {
  background: #f5f5f5;
}
.icon-left-gap { margin-right: 6px; }

/* Modale de confirmation reset */
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
