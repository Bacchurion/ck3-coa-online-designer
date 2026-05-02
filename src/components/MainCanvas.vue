<template>
  <div class="canvas-box d-flex align-items-center justify-content-center"
       @dragover.prevent="onCanvasDragOver"
       @drop="handleDrop">
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

      <!-- UI layer for transformer -->
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
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'

const props = defineProps({
  canvasImages: Array,
  canvasSize: Number,
  selectedIndex: Number,
  selectedPatternEl: Object,
  stageSize: Object,
})

const emit = defineEmits([
  'update:selectedIndex',
  'drop',
  'transform-end',
  'drag-end',
  'get-stage-ref'
])

const stageRef = ref(null)
const layerRef = ref(null)
const patternLayerRef = ref(null)
const uiLayerRef = ref(null)
const transformerRef = ref(null)
const imageRefs = ref([])
const dragState = ref({ idx: null, startX: 0, startY: 0, imgStartX: 0, imgStartY: 0 })

// Expose refs to parent
defineExpose({
  stageRef,
  transformerRef,
  imageRefs,
  updateMiniature
})

function setImageRef(i, el) {
  imageRefs.value[i] = el
  nextTick(() => cacheImageNode(i))
}

function cacheImageNode(i) {
  const node = imageRefs.value[i]?.getNode?.()
  if (!node) return
  try {
    node.cache({ pixelRatio: 1 })
    node.drawHitFromCache(false)
    node.getLayer()?.batchDraw?.()
  } catch {
    // ignore cache errors
  }
}

function limitBox(oldBox, newBox) {
  if (newBox.width < 30 || newBox.height < 30) return oldBox
  return newBox
}

function onTransformEnd(i, e) {
  emit('transform-end', { index: i, event: e })
}

function onImageDragEnd(i, e) {
  emit('drag-end', { index: i, event: e })
}

function onCanvasDragOver(e) {
  e.preventDefault()
}

function handleDrop(e) {
  emit('drop', e)
}

const renderList = computed(() => {
  const list = props.canvasImages
    .map((img, idx) => ({ img, idx }))
    .sort((a, b) => {
      const da = Number(a.img.depth ?? 0)
      const db = Number(b.img.depth ?? 0)
      if (db !== da) return db - da
      return a.idx - b.idx
    })
  return list
})

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

function onStageMouseDown(e) {
  if (isTransformerTarget(e?.target)) return

  const stage = stageRef.value?.getNode?.()
  if (!stage) return
  const pos = stage.getPointerPosition()
  if (!pos) return

  const current = props.selectedIndex
  let picked = null
  if (current !== null) {
    const selImg = props.canvasImages[current]
    if (selImg && isPointInEmblem(selImg, pos.x, pos.y)) {
      picked = current
    }
  }

  if (picked === null) {
    const list = renderList.value
    for (let i = list.length - 1; i >= 0; i--) {
      const { img, idx } = list[i]
      if (isPointInEmblem(img, pos.x, pos.y)) {
        picked = idx
        break
      }
    }
    emit('update:selectedIndex', picked === null ? null : picked)
  }

  if (picked !== null && (!e?.evt || e.evt.button === 0)) {
    const img = props.canvasImages[picked]
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
  const img = props.canvasImages[i]
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

  emit('drag-end', { index: i, event: null })
}

function isTransformerTarget(konvaTarget) {
  const tr = transformerRef.value?.getNode?.()
  if (!tr || !konvaTarget) return false
  if (konvaTarget === tr) return true
  if (typeof tr.isAncestorOf === 'function' && tr.isAncestorOf(konvaTarget)) return true
  let p = konvaTarget.getParent?.()
  while (p) {
    if (p === tr) return true
    p = p.getParent?.()
  }
  return false
}

function updateMiniature() {
  const stage = stageRef.value?.getNode?.()
  if (!stage) return null

  const trNode = transformerRef.value?.getNode?.()
  let prevVisible
  if (trNode && typeof trNode.visible === 'function') {
    prevVisible = trNode.visible()
    trNode.visible(false)
    stage.batchDraw()
  }

  const canvas = stage.toCanvas()
  const dataUrl = canvas.toDataURL()

  if (trNode && typeof trNode.visible === 'function') {
    trNode.visible(prevVisible)
    stage.batchDraw()
  }

  return dataUrl
}
</script>

<style scoped>
.canvas-box {
  width: 400px;
  height: 400px;
  background: white;
  outline: 6px solid #ccb115;
}
</style>
