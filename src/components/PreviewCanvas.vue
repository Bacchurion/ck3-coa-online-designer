<template>
  <!-- Ligne 1 : preview house + preview title, centrées verticalement -->
  <div class="preview-row preview-row-top">
    <div class="preview-house-canvas">
      <v-stage :config="{ width: houseWidth, height: houseHeight }">
        <v-layer>
          <v-group
            :config="{
              x: (houseWidth - houseCoatSize) / 2,
              y: (houseHeight - houseCoatSize) / 2,
              width: houseCoatSize,
              height: houseCoatSize,
              listening: false
            }"
          >
            <v-image
              v-if="previewImg"
              :config="{
                image: previewImg,
                x: 0,
                y: 0,
                width: houseCoatSize,
                height: houseCoatSize,
                listening: false
              }"
            />
          </v-group>
          <v-image
            v-if="houseMaskImage"
            :config="{
              image: houseMaskImage,
              x: 0,
              y: 0,
              width: houseWidth,
              height: houseHeight,
              globalCompositeOperation: 'destination-in',
              listening: false
            }"
          />
          <v-image
            v-if="houseImage"
            :config="{
              x: 0,
              y: 0,
              image: houseImage,
              listening: false,
            }"
          />
        </v-layer>
      </v-stage>
    </div>
    <div class="preview-title-canvas">
      <v-stage :config="{ width: titleWidth, height: titleHeight }">
        <v-layer>
          <v-group
            :config="{
              x: (titleWidth - titleCoatSize) / 2,
              y: (titleHeight - titleCoatSize) / 2,
              width: titleCoatSize,
              height: titleCoatSize,
              listening: false
            }"
          >
            <v-image
              v-if="previewImg"
              :config="{
                image: previewImg,
                x: 0,
                y: 0,
                width: titleCoatSize,
                height: titleCoatSize,
                listening: false
              }"
            />
          </v-group>
          <v-image
            v-if="titleMaskImage"
            :config="{
              image: titleMaskImage,
              x: 0,
              y: 0,
              width: titleWidth,
              height: titleHeight,
              globalCompositeOperation: 'destination-in',
              listening: false
            }"
          />
          <v-image
            v-if="titleImage"
            :config="{
              x: 0,
              y: 0,
              image: titleImage,
              listening: false,
            }"
          />
        </v-layer>
      </v-stage>
    </div>
  </div>
  <!-- Ligne 2 : dropbox + preview landed-title -->
  <div class="preview-row preview-row-bottom">
    <div class="dropbox-container">
      <div class="mask-select-col">
        <label for="mask-select" class="mask-label">{{ $t('government_type') }}</label>
        <select
          id="mask-select"
          v-model="selectedMask"
          class="form-select mask-select"
        >
          <option value="default">{{ $t('government_default') }}</option>
          <option value="administrative">{{ $t('government_administrative') }}</option>
          <option value="clan">{{ $t('government_clan') }}</option>
          <option value="herder">{{ $t('government_herder') }}</option>
          <option value="landless">{{ $t('government_landless') }}</option>
          <option value="nomad">{{ $t('government_nomad') }}</option>
          <option value="republic">{{ $t('government_republic') }}</option>
          <option value="theocracy">{{ $t('government_theocracy') }}</option>
          <option value="tribal">{{ $t('government_tribal') }}</option>
        </select>
      </div>
    </div>
    <div class="preview-landed-title-canvas">
      <div>
        <v-stage :config="{ width: defaultWidth, height: defaultHeight }">
          <v-layer>
            <v-image
              :config="{
                x: 0,
                y: 0,
                image: currentShadowImage,
                listening: false,
              }"
            />
            <v-group
              ref="coaGroup"
              :config="{
                x: (defaultWidth - defaultCoatWidth) / 2,
                y: (defaultHeight - defaultCoatHeight) / 2,
                width: defaultCoatWidth,
                height: defaultCoatHeight,
                listening: false
              }"
            >
              <v-image
                v-if="previewImg"
                :config="{
                  image: previewImg,
                  x: 0,
                  y: 0,
                  width: defaultCoatWidth,
                  height: defaultCoatHeight,
                  listening: false
                }"
              />
              <v-image
                v-if="currentMaskImage"
                :config="{
                  image: currentMaskImage,
                  x: 0,
                  y: 0,
                  width: defaultWidth,
                  height: defaultHeight,
                  globalCompositeOperation: 'destination-in',
                  listening: false
                }"
              />
            </v-group>
            <v-image
              v-if="topFrameImage"
              :config="{
                x: 0,
                y: 0,
                image: topFrameImage,
                listening: false,
              }"
            />
          </v-layer>
        </v-stage>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'

// Utilise les chemins du dossier public
const housePng = import.meta.env.BASE_URL + 'coat_of_arms/interface/house.png'
const houseMaskPng = import.meta.env.BASE_URL + 'coat_of_arms/interface/house_mask.png'
const titlePng = import.meta.env.BASE_URL + 'coat_of_arms/interface/title.png'
const titleMaskPng = import.meta.env.BASE_URL + 'coat_of_arms/interface/title_mask.png'
const topFramePng = import.meta.env.BASE_URL + 'coat_of_arms/interface/topframe.png'

const props = defineProps({
  canvasSize: Object,
  previewImage: String // DataURL string
})

const houseWidth = 153
const houseHeight = 150
const houseCoatSize = 114

const titleWidth = 96
const titleHeight = 96
const titleCoatSize = 85

const defaultWidth = 116
const defaultHeight = 128
const defaultCoatWidth = 116
const defaultCoatHeight = 128

const selectedMask = ref('default')
const maskImages = ref({
  default: null,
  administrative: null
})
const shadowImages = ref({
  default: null,
  administrative: null
})
const currentMaskImage = ref(null)
const currentShadowImage = ref(null)
const houseImage = ref(null)
const houseMaskImage = ref(null)
const previewImg = ref(null)

const titleImage = ref(null)
const titleMaskImage = ref(null)

const topFrameImage = ref(null)
const coaGroup = ref(null)


watch(() => props.previewImage, (val) => {
  if (val) {
    const img = new window.Image()
    img.src = val
    img.onload = () => {
      previewImg.value = img
    }
  } else {
    previewImg.value = null
  }
}, { immediate: true })

function updateCurrentMask() {
  const img = maskImages.value[selectedMask.value]
  if (img && img.complete) {
    currentMaskImage.value = img
  } else {
    currentMaskImage.value = null
  }

  const shadowImg = shadowImages.value[selectedMask.value]
  if (shadowImg && shadowImg.complete) {
    currentShadowImage.value = shadowImg
  } else {
    currentShadowImage.value = null
  }
}

watch(selectedMask, () => {
  updateCurrentMask()
})

watch([previewImg, currentMaskImage], async () => {
  await nextTick()
  if (coaGroup.value && coaGroup.value.getNode) {
    coaGroup.value.getNode().cache()
  }
})


onMounted(() => {
  const imgHouse = new window.Image()
  imgHouse.src = housePng
  imgHouse.onload = () => (houseImage.value = imgHouse)

  const imgHouseMask = new window.Image()
  imgHouseMask.src = houseMaskPng
  imgHouseMask.onload = () => (houseMaskImage.value = imgHouseMask)

  const imgTitle = new window.Image()
  imgTitle.src = titlePng
  imgTitle.onload = () => (titleImage.value = imgTitle)

  const imgTitleMask = new window.Image()
  imgTitleMask.src = titleMaskPng
  imgTitleMask.onload = () => (titleMaskImage.value = imgTitleMask)

  // Dynamic loading
  const maskTypes = ['default', 'administrative', 'clan', 'herder', 'landless', 'nomad', 'republic', 'theocracy', 'tribal']
  maskTypes.forEach((maskType) => {
    // Masks
    const img = new window.Image()
    img.src = import.meta.env.BASE_URL + `coat_of_arms/interface/${maskType}_mask.png`
    img.onload = () => {
      maskImages.value[maskType] = img
      updateCurrentMask()
    }
    // Shadows
    const shadowImg = new window.Image()
    shadowImg.src = import.meta.env.BASE_URL + `coat_of_arms/interface/${maskType}_shadow.png`
    shadowImg.onload = () => {
      shadowImages.value[maskType] = shadowImg
      updateCurrentMask()
    }
  })

  const imgTopFrame = new window.Image()
  imgTopFrame.src = topFramePng
  imgTopFrame.onload = () => (topFrameImage.value = imgTopFrame)
})
</script>

<style scoped>
.preview-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 32px;
  margin-bottom: 8px;
}
.preview-row-top {
  padding-top: 40px;
  margin-bottom: 0;
}
.preview-row-bottom {
  margin-top: 28px;
  margin-bottom: 0;
}
/* Les cadres font 160px, le canvas interne garde sa taille d'origine */
.preview-house-canvas {
  border: 1px solid #bbb;
  border-radius: 6px;
  background: #fff;
  width: 160px;
  height: 160px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview-title-canvas {
  border: 1px solid #bbb;
  border-radius: 6px;
  background: #fff;
  width: 160px;
  height: 160px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview-landed-title-canvas {
  border: 1px solid #bbb;
  border-radius: 6px;
  background: #fff;
  width: 160px;
  height: 160px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dropbox-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 180px;
}
.mask-select-col {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  margin-bottom: 8px;
  width: 160px;
  margin-left: 8px;
}
.mask-label {
  text-align: center;
  font-weight: 500;
}
.mask-select {
  width: 100%;
  min-width: 0;
  max-width: 160px;
  height: 38px;
  box-sizing: border-box;
}
.preview-canvas :deep(.konvajs-content) {
  pointer-events: none !important;
  user-select: none !important;
}
</style>
