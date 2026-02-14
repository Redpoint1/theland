<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    maxWidth?: string
    align?: 'center' | 'left' | 'right'
    placement?: 'top' | 'bottom'
    teleport?: boolean
  }>(),
  {
    maxWidth: '340px',
    align: 'center',
    placement: 'top',
    teleport: false,
  },
)

const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const portalStyle = ref<Record<string, string>>({})

const computePortalStyle = () => {
  const trigger = triggerRef.value
  if (!trigger) return
  const rect = trigger.getBoundingClientRect()

  let left = rect.left + rect.width / 2
  let top = rect.top - 8
  let transform = 'translate(-50%, -100%)'

  if (props.align === 'left') {
    left = rect.left
    transform = 'translate(0, -100%)'
  } else if (props.align === 'right') {
    left = rect.right
    transform = 'translate(-100%, -100%)'
  }

  if (props.placement === 'bottom') {
    top = rect.bottom + 8
    if (props.align === 'center') transform = 'translate(-50%, 0)'
    if (props.align === 'left') transform = 'translate(0, 0)'
    if (props.align === 'right') transform = 'translate(-100%, 0)'
  }

  portalStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
    transform,
    maxWidth: props.maxWidth,
  }
}

const handleWindowChange = () => {
  if (!isOpen.value || !props.teleport) return
  computePortalStyle()
}

const openTooltip = () => {
  isOpen.value = true
  if (!props.teleport) return
  computePortalStyle()
  window.addEventListener('scroll', handleWindowChange, true)
  window.addEventListener('resize', handleWindowChange)
}

const closeTooltip = () => {
  isOpen.value = false
  window.removeEventListener('scroll', handleWindowChange, true)
  window.removeEventListener('resize', handleWindowChange)
}

const onFocusOut = (event: FocusEvent) => {
  const next = event.relatedTarget as Node | null
  if (next && rootRef.value?.contains(next)) return
  closeTooltip()
}

watch(
  () => [props.align, props.placement, props.maxWidth, props.teleport],
  () => {
    if (isOpen.value && props.teleport) {
      computePortalStyle()
    }
  },
)

onBeforeUnmount(() => {
  closeTooltip()
})
</script>

<template>
  <div
    ref="rootRef"
    class="info-tooltip-root"
    :class="[`align-${align}`, `placement-${placement}`]"
    tabindex="0"
    @mouseenter="openTooltip"
    @mouseleave="closeTooltip"
    @focusin="openTooltip"
    @focusout="onFocusOut"
  >
    <div ref="triggerRef" class="info-tooltip-trigger">
      <slot name="trigger" />
    </div>
    <div v-if="!teleport" class="info-tooltip-panel" :style="{ maxWidth }">
      <slot name="content" />
    </div>
  </div>

  <Teleport to="body">
    <div v-if="teleport && isOpen" class="info-tooltip-portal" :style="portalStyle">
      <slot name="content" />
    </div>
  </Teleport>
</template>
