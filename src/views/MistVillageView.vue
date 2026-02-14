<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '../stores/game'

type VillageAreaId =
  | 'barter-circle'
  | 'request-board'
  | 'rift-well'
  | 'tamer-pens'
  | 'council-hall'

interface VillageArea {
  id: VillageAreaId
  name: string
  purpose: string
  detail: string
}

interface BarterBundle {
  id: string
  name: string
  costCopper: number
  rewards: Array<{ itemId: string; amount: number }>
  description: string
}

interface RequestContract {
  id: string
  title: string
  inputs: Array<{ itemId: string; amount: number }>
  rewardCopper: number
  rewardExp: number
  reputation: number
}

interface Attunement {
  id: string
  name: string
  crystalCost: number
  rewardExp?: number
  rewardCopper?: number
  rewardItems?: Array<{ itemId: string; amount: number }>
  description: string
}

interface Decree {
  id: string
  name: string
  repCost: number
  rewardCopper?: number
  rewardExp?: number
  rewardItems?: Array<{ itemId: string; amount: number }>
  description: string
}

const game = useGameStore()
const { currencyBreakdown } = storeToRefs(game)

const areas: VillageArea[] = [
  {
    id: 'barter-circle',
    name: 'Barter Circle',
    purpose: 'Bundle trade with village caravans',
    detail: 'Traveling merchants in Mist Village offer fixed supply bundles not found in normal stalls.',
  },
  {
    id: 'request-board',
    name: 'Request Board',
    purpose: 'Turn in materials for renown',
    detail: 'Villagers post practical requests that grant reputation and adventurer rewards.',
  },
  {
    id: 'rift-well',
    name: 'Riftstone Well',
    purpose: 'Spend crystals on attunements',
    detail: 'A mana-scarred well where crystals can be distilled into immediate boons.',
  },
  {
    id: 'tamer-pens',
    name: 'Tamer Pens',
    purpose: 'Dispatch scouting beast runs',
    detail: 'Handlers at the pens send trained beasts into the mist and return with salvage.',
  },
  {
    id: 'council-hall',
    name: 'Council Hall',
    purpose: 'Spend village reputation',
    detail: 'Earned favor in Mist Village can be exchanged for writs and council decrees.',
  },
]

const barterBundles: BarterBundle[] = [
  {
    id: 'forager-cache',
    name: "Forager's Cache",
    costCopper: 20,
    rewards: [{ itemId: 'mist-herb', amount: 12 }],
    description: 'Packed herbs from village gatherers.',
  },
  {
    id: 'smith-crate',
    name: "Smith's Crate",
    costCopper: 38,
    rewards: [{ itemId: 'iron-ore', amount: 20 }],
    description: 'Ore lots salvaged from shallow veins.',
  },
  {
    id: 'rift-pack',
    name: 'Rift Pack',
    costCopper: 95,
    rewards: [
      { itemId: 'mana-crystal', amount: 4 },
      { itemId: 'mist-herb', amount: 8 },
    ],
    description: 'Mana-infused reagents for crafters and arcanists.',
  },
]

const contracts: RequestContract[] = [
  {
    id: 'apothecary-supply',
    title: 'Apothecary Supply Run',
    inputs: [{ itemId: 'mist-herb', amount: 10 }],
    rewardCopper: 35,
    rewardExp: 20,
    reputation: 2,
  },
  {
    id: 'forge-stocking',
    title: 'Forge Stocking Order',
    inputs: [{ itemId: 'iron-ore', amount: 14 }],
    rewardCopper: 55,
    rewardExp: 30,
    reputation: 3,
  },
  {
    id: 'warding-mixture',
    title: 'Warding Mixture',
    inputs: [
      { itemId: 'mist-herb', amount: 8 },
      { itemId: 'mana-crystal', amount: 2 },
    ],
    rewardCopper: 95,
    rewardExp: 45,
    reputation: 4,
  },
]

const attunements: Attunement[] = [
  {
    id: 'vital-aura',
    name: 'Vital Aura',
    crystalCost: 1,
    rewardExp: 45,
    rewardItems: [{ itemId: 'minor-elixir', amount: 1 }],
    description: 'Distill one crystal into restorative essence.',
  },
  {
    id: 'forge-echo',
    name: 'Forge Echo',
    crystalCost: 1,
    rewardItems: [{ itemId: 'iron-ingot', amount: 2 }],
    description: 'Imprint crystal resonance into refined metal.',
  },
  {
    id: 'copper-flux',
    name: 'Copper Flux',
    crystalCost: 2,
    rewardCopper: 120,
    rewardExp: 30,
    description: 'Condense unstable mana into marketable slag.',
  },
]

const decrees: Decree[] = [
  {
    id: 'supply-writ',
    name: 'Supply Writ',
    repCost: 6,
    rewardItems: [
      { itemId: 'mist-herb', amount: 20 },
      { itemId: 'iron-ore', amount: 10 },
    ],
    description: 'Council-sanctioned allocation from village reserves.',
  },
  {
    id: 'trade-charter',
    name: 'Trade Charter',
    repCost: 8,
    rewardCopper: 180,
    description: 'Access to better caravan rates and stipend.',
  },
  {
    id: 'militia-citation',
    name: 'Militia Citation',
    repCost: 10,
    rewardExp: 120,
    rewardItems: [{ itemId: 'goblin-ear', amount: 2 }],
    description: 'Official commendation and tactical briefing.',
  },
]

const selectedArea = ref<VillageAreaId>('barter-circle')
const reputation = ref(0)
const now = ref(Date.now())
const dispatchReadyAt = ref(0)
const decreesClaimed = ref<string[]>([])
const villageLog = ref<string[]>([])

let timerHandle: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  timerHandle = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  if (timerHandle) clearInterval(timerHandle)
})

const totalCopper = computed(
  () =>
    currencyBreakdown.value.gold * 10000 +
    currencyBreakdown.value.silver * 100 +
    currencyBreakdown.value.copper,
)

const dispatchSecondsLeft = computed(() =>
  Math.max(0, Math.ceil((dispatchReadyAt.value - now.value) / 1000)),
)

const canClaimDispatch = computed(
  () => dispatchReadyAt.value > 0 && dispatchReadyAt.value <= now.value,
)

const addVillageLog = (message: string) => {
  villageLog.value.push(`${new Date().toLocaleTimeString()} - ${message}`)
  if (villageLog.value.length > 20) {
    villageLog.value.shift()
  }
}

const itemName = (itemId: string) => game.getItemDef(itemId)?.name ?? itemId

const formatItems = (items: Array<{ itemId: string; amount: number }>) =>
  items.map((entry) => `${itemName(entry.itemId)} x${entry.amount}`).join(', ')

const canAffordBundle = (bundle: BarterBundle) => totalCopper.value >= bundle.costCopper

const buyBundle = (bundle: BarterBundle) => {
  if (!game.spendCurrency(bundle.costCopper)) return
  bundle.rewards.forEach((reward) => game.addItem(reward.itemId, reward.amount))
  addVillageLog(`Bought ${bundle.name}: ${formatItems(bundle.rewards)}.`)
  game.addActionLog('reward', `Mist Village bundle acquired: ${bundle.name}.`)
}

const canFulfillContract = (contract: RequestContract) =>
  contract.inputs.every((entry) => game.getItemQuantity(entry.itemId) >= entry.amount)

const fulfillContract = (contract: RequestContract) => {
  if (!canFulfillContract(contract)) return
  contract.inputs.forEach((entry) => {
    game.removeItem(entry.itemId, entry.amount)
  })
  game.addCurrency(contract.rewardCopper)
  game.addCharacterExp(contract.rewardExp)
  reputation.value += contract.reputation
  addVillageLog(
    `Completed ${contract.title}: +${contract.rewardCopper}c, +${contract.rewardExp} XP, +${contract.reputation} reputation.`,
  )
}

const canUseAttunement = (attunement: Attunement) =>
  game.getItemQuantity('mana-crystal') >= attunement.crystalCost

const applyAttunement = (attunement: Attunement) => {
  if (!canUseAttunement(attunement)) return
  game.removeItem('mana-crystal', attunement.crystalCost)
  if (attunement.rewardCopper) game.addCurrency(attunement.rewardCopper)
  if (attunement.rewardExp) game.addCharacterExp(attunement.rewardExp)
  if (attunement.rewardItems) {
    attunement.rewardItems.forEach((entry) => game.addItem(entry.itemId, entry.amount))
  }
  addVillageLog(
    `${attunement.name} attunement completed.`,
  )
}

const startDispatch = () => {
  if (dispatchReadyAt.value > now.value) return
  if (game.getItemQuantity('mist-herb') < 4) return
  game.removeItem('mist-herb', 4)
  dispatchReadyAt.value = Date.now() + 45000
  addVillageLog('Beast dispatch sent into the mist (45s).')
}

const claimDispatch = () => {
  if (!canClaimDispatch.value) return
  dispatchReadyAt.value = 0

  const roll = Math.random()
  if (roll < 0.45) {
    game.addItem('iron-ore', 6)
    addVillageLog('Dispatch returned with Iron Ore x6.')
  } else if (roll < 0.8) {
    game.addItem('mana-crystal', 1)
    game.addItem('mist-herb', 4)
    addVillageLog('Dispatch returned with Mana Crystal x1 and Mist Herb x4.')
  } else {
    game.addItem('goblin-ear', 1)
    game.addCharacterExp(35)
    addVillageLog('Dispatch returned with Goblin Ear x1 and tactical notes (+35 XP).')
  }

  reputation.value += 1
}

const canClaimDecree = (decree: Decree) =>
  !decreesClaimed.value.includes(decree.id) && reputation.value >= decree.repCost

const claimDecree = (decree: Decree) => {
  if (!canClaimDecree(decree)) return
  reputation.value -= decree.repCost
  decreesClaimed.value.push(decree.id)

  if (decree.rewardCopper) game.addCurrency(decree.rewardCopper)
  if (decree.rewardExp) game.addCharacterExp(decree.rewardExp)
  if (decree.rewardItems) {
    decree.rewardItems.forEach((entry) => game.addItem(entry.itemId, entry.amount))
  }

  addVillageLog(`Council decree claimed: ${decree.name}.`)
}

const selectedAreaMeta = computed(() => areas.find((area) => area.id === selectedArea.value))
</script>

<template>
  <main class="app">
    <header class="hero">
      <div>
        <p class="eyebrow">The Land: Mist Village</p>
        <h1>Mist Village</h1>
        <p class="subtitle">
          A true village hub: barter caravans, contract work, rift attunements, beast scouting, and council favors.
        </p>
      </div>
      <div class="hero-actions">
        <div class="tick">
          Coin: {{ currencyBreakdown.gold }}g {{ currencyBreakdown.silver }}s {{ currencyBreakdown.copper }}c
        </div>
        <div class="tick">Village Reputation: {{ reputation }}</div>
      </div>
    </header>

    <section class="grid village-grid">
      <div class="panel village-areas">
        <h2>Village Map</h2>
        <div class="zone-grid">
          <button
            v-for="area in areas"
            :key="area.id"
            class="zone-card"
            :class="{ selected: area.id === selectedArea }"
            @click="selectedArea = area.id"
          >
            <div class="item-title">{{ area.name }}</div>
            <div class="item-desc">{{ area.purpose }}</div>
          </button>
        </div>
      </div>

      <div class="panel village-area-content">
        <template v-if="selectedArea === 'barter-circle'">
          <h2>Barter Circle</h2>
          <div class="item-desc">Fixed caravan bundles with better value than individual stall buying.</div>
          <div class="village-shop-list">
            <div v-for="bundle in barterBundles" :key="bundle.id" class="village-shop-row">
              <div>
                <div class="item-title">{{ bundle.name }}</div>
                <div class="item-desc">{{ bundle.description }}</div>
                <div class="item-hint">Rewards: {{ formatItems(bundle.rewards) }}</div>
              </div>
              <button class="toggle" :disabled="!canAffordBundle(bundle)" @click="buyBundle(bundle)">
                Buy ({{ bundle.costCopper }}c)
              </button>
            </div>
          </div>
        </template>

        <template v-else-if="selectedArea === 'request-board'">
          <h2>Request Board</h2>
          <div class="item-desc">Turn in gathered materials for immediate rewards and village favor.</div>
          <div class="list">
            <div v-for="contract in contracts" :key="contract.id" class="profession-action">
              <div>
                <div class="item-title">{{ contract.title }}</div>
                <div class="item-hint">Needs: {{ formatItems(contract.inputs) }}</div>
                <div class="item-desc">
                  Rewards: +{{ contract.rewardCopper }}c, +{{ contract.rewardExp }} XP, +{{ contract.reputation }} rep
                </div>
              </div>
              <button class="toggle" :disabled="!canFulfillContract(contract)" @click="fulfillContract(contract)">
                Fulfill
              </button>
            </div>
          </div>
        </template>

        <template v-else-if="selectedArea === 'rift-well'">
          <h2>Riftstone Well</h2>
          <div class="item-desc">Convert Mana Crystals into one-shot village boons.</div>
          <div class="list">
            <div v-for="attunement in attunements" :key="attunement.id" class="profession-action">
              <div>
                <div class="item-title">{{ attunement.name }}</div>
                <div class="item-desc">{{ attunement.description }}</div>
                <div class="item-hint">Cost: Mana Crystal x{{ attunement.crystalCost }}</div>
              </div>
              <button class="toggle" :disabled="!canUseAttunement(attunement)" @click="applyAttunement(attunement)">
                Attune
              </button>
            </div>
          </div>
        </template>

        <template v-else-if="selectedArea === 'tamer-pens'">
          <h2>Tamer Pens</h2>
          <div class="item-desc">Spend bait herbs to launch a timed scout run into the mists.</div>
          <div class="village-shrine-actions">
            <button class="toggle" :disabled="dispatchSecondsLeft > 0 || game.getItemQuantity('mist-herb') < 4" @click="startDispatch">
              Send Dispatch (Mist Herb x4)
            </button>
            <button class="toggle" :disabled="!canClaimDispatch" @click="claimDispatch">
              Claim Dispatch Reward
            </button>
            <div class="item-hint" v-if="dispatchSecondsLeft > 0">Return in {{ dispatchSecondsLeft }}s</div>
          </div>
        </template>

        <template v-else>
          <h2>Council Hall</h2>
          <div class="item-desc">Spend reputation on one-time decrees from the village council.</div>
          <div class="list">
            <div
              v-for="decree in decrees"
              :key="decree.id"
              class="profession-action"
              :class="{ locked: decreesClaimed.includes(decree.id) }"
            >
              <div>
                <div class="item-title">{{ decree.name }}</div>
                <div class="item-desc">{{ decree.description }}</div>
                <div class="item-hint">Cost: {{ decree.repCost }} rep</div>
              </div>
              <button class="toggle" :disabled="!canClaimDecree(decree)" @click="claimDecree(decree)">
                {{ decreesClaimed.includes(decree.id) ? 'Claimed' : 'Enact' }}
              </button>
            </div>
          </div>
        </template>
      </div>

      <div class="panel village-area-details">
        <h2>Area Details</h2>
        <div class="item-title">{{ selectedAreaMeta?.name }}</div>
        <div class="item-desc">{{ selectedAreaMeta?.detail }}</div>
        <div class="label">Village Log</div>
        <div class="log-list village-log-list">
          <div v-if="villageLog.length === 0" class="log-empty">No village events yet.</div>
          <div v-for="entry in [...villageLog].reverse()" :key="entry" class="log-message">{{ entry }}</div>
        </div>
      </div>
    </section>
  </main>
</template>
