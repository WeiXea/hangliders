import { useGameStore } from './game/gameStore'
import { HomeScreen } from './ui/HomeScreen'
import { FlightHUD } from './ui/FlightHUD'
import { ResultScreen } from './ui/ResultScreen'

export default function App() {
  const screen = useGameStore((s) => s.screen)

  return (
    <>
      {screen === 'home' && <HomeScreen />}
      {screen === 'flight' && <FlightHUD />}
      {screen === 'result' && (
        <>
          <FlightHUD />
          <ResultScreen />
        </>
      )}
    </>
  )
}
