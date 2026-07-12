const TUTORIAL_KEY = 'hg-tutorial-v1'

export type TutorialStep = 'speed' | 'climb' | 'thermal' | 'land' | 'done'

export function readTutorialDone(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === '1'
  } catch {
    return false
  }
}

export function writeTutorialDone() {
  try {
    localStorage.setItem(TUTORIAL_KEY, '1')
  } catch {
    /* */
  }
}

export function tutorialCopy(step: TutorialStep): { title: string; body: string } | null {
  switch (step) {
    case 'speed':
      return {
        title: '1 · Build speed',
        body: 'Hold Shift / + until speed turns green (~11+).',
      }
    case 'climb':
      return {
        title: '2 · Lift off',
        body: 'Pull back / ↓ Climb to leave the ground.',
      }
    case 'thermal':
      return {
        title: '3 · Find lift',
        body: 'Steer into a green thermal column — Thermal meter fills when air rises under you.',
      }
    case 'land':
      return {
        title: '4 · Land or end',
        body: 'Slow down near the ground, or press End flight when walking.',
      }
    default:
      return null
  }
}
