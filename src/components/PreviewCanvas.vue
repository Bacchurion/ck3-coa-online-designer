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

        <VueSelect v-model="selectedMask" :options="governmentList" :isClearable=false>
          <template #option="{ option }">
            <img :src="`${option.icon}`" alt="" width="24" height="24"/>
            {{ $t('government_' + option.value) }}
          </template>
          <template #value="{ option }">
            <img :src="`${option.icon}`" alt="" width="24" height="24"/>
            {{ $t('government_' + option.value) }}
          </template>
        </VueSelect>

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
                x: 0,
                y: 0,
                width: defaultCoatWidth,
                height: defaultCoatHeight,
                listening: false
              }"
            >
              <!-- We define a background, so if the offseting/scaling doesn't fill the mask
               completely (ex: meritocratic khanate) at least a color is shown
               CK3 seems to use the same hacky thing -->
              <v-rect
                :config="{
                  x: 0,
                  y: 0,
                  width: defaultCoatWidth,
                  height: defaultCoatHeight,
                  fill: props.patternColors?.[0]|| 'black',
                  listening: false
                }"
              />

              <!-- Preview of the coat of arms -->
              <v-image
                v-if="previewImg"
                :config="{
                  image: previewImg,
                  x: selectedGovernment.x,
                  y: selectedGovernment.y,
                  width: selectedGovernment.width,
                  height: selectedGovernment.height,
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
                y: -10,
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
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import VueSelect from "vue3-select-component";
import "vue3-select-component/styles";

// Utilise les chemins du dossier public
const baseURL = import.meta.env.BASE_URL
const housePng = baseURL + 'coat_of_arms/interface/house.png'
const houseMaskPng = baseURL + 'coat_of_arms/interface/house_mask.png'
const titlePng = baseURL + 'coat_of_arms/interface/title.png'
const titleMaskPng = baseURL + 'coat_of_arms/interface/title_mask.png'
const topFramePng = baseURL + 'coat_of_arms/interface/topframe.png'
const governmentIconPathBase = baseURL + 'interface/government/'

const props = defineProps({
  canvasSize: Object,
  previewImage: String,
  patternColors: Object
})

const houseWidth = 153
const houseHeight = 150
const houseCoatSize = 114

const titleWidth = 96
const titleHeight = 96
const titleCoatSize = 85

const defaultWidth = 128
const defaultHeight = 128
const defaultCoatWidth = 128
const defaultCoatHeight = 128

const governmentList = ref([
    {value: 'default', icon: governmentIconPathBase + 'feudal.png', offset: [0, -0.01]},
    {value: 'administrative', icon: governmentIconPathBase + 'administrative.png', offset: [0, -0.01]},
    {value: 'celestial', icon: governmentIconPathBase + 'celestial.png', offset: [0, -0.01], scale: [0.94, 0.94]},
    {value: 'clan', icon: governmentIconPathBase + 'clan.png', offset: [0, -0.03]},
    {value: 'herder', icon: governmentIconPathBase + 'herder.png', offset: [0, -0.12], scale: [0.8, 0.8]},
    {value: 'japan_administrative', icon: governmentIconPathBase + 'japan_administrative.png', offset: [-0.02, -0.072], scale: [0.88, 0.88]},
    {value: 'japan_feudal', icon: governmentIconPathBase + 'japan_feudal.png', offset: [0, -0.075], scale: [0.95, 0.95]},
    {value: 'landless', icon: governmentIconPathBase + 'landless_adventurer.png'},
    {value: 'mandala', icon: governmentIconPathBase + 'mandala.png', offset: [0, -0.05], scale: [0.92, 0.92]},
    {value: 'meritocratic', icon: governmentIconPathBase + 'meritocratic.png', offset: [0, -0.12], scale: [0.92, 0.92]},
    {value: 'nomad', icon: governmentIconPathBase + 'nomad.png', offset: [0, -0.12], scale: [0.8, 0.8]},
    {value: 'republic', icon: governmentIconPathBase + 'republic.png', offset: [0, 0.01]},
    {value: 'theocracy', icon: governmentIconPathBase + 'theocracy.png', offset: [0, -0.02], scale: [0.95, 0.95]},
    {value: 'tribal', icon: governmentIconPathBase + 'tribal.png', scale: [0.96, 0.96]},
    {value: 'steppe_admin', icon: governmentIconPathBase + 'steppe_admin.png', offset: [0, -0.2], scale: [0.78, 0.78]},
    {value: 'wanua', icon: governmentIconPathBase + 'wanua.png', offset: [0, -0.09], scale: [0.9, 0.9]}
]);

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

  governmentList.value.forEach((g) => {

    var maskType = g.value;
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

const selectedGovernment = computed(() => {
  var gov = governmentList.value.find(g => g.value === selectedMask.value);
  var width = defaultCoatWidth * (gov.scale?.[0] || 1);
  var height = defaultCoatHeight * (gov.scale?.[1] || 1);

  return {
    x: (defaultCoatWidth - width)/2 + (width * (gov.offset?.[0] || 0)),
    y: (defaultCoatHeight - height)/2 + (height * (gov.offset?.[1] || 0)),
    width: width,
    height: height
  }
})
</script>

<style scoped>
.preview-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 10%;
  width: 100%;
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
  min-width: 200px;
}
.mask-select-col {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  margin-bottom: 8px;
  margin-left: 8px;
}
.mask-label {
  text-align: center;
  font-weight: 500;
}
.preview-canvas :deep(.konvajs-content) {
  pointer-events: none !important;
  user-select: none !important;
}
</style>
