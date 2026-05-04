import { __detectStateForTest } from '../app/api/whatsapp/route.ts'

// Скрываем шумные debug-логи классификатора в тестовом прогоне
const _log = console.log.bind(console)
console.log = (...args: any[]) => {
  if (args && args[0] === 'FIXBUILD_CLASSIFIER_DEBUG') return
  _log(...args)
}

const TEST_CASES: Array<{ text: string; expected: 'red' | 'yellow' | 'green' }> = [
  // RED — должны быть red
  { text: 'ЖК Орда не успели закончить фасад', expected: 'red' },
  { text: 'Нет бетона работы стоят', expected: 'red' },
  { text: 'Кровлю не сделали', expected: 'red' },
  { text: 'Люди не вышли', expected: 'red' },
  { text: 'Срыв сроков по фундаменту', expected: 'red' },
  { text: 'Трещина в стене', expected: 'red' },
  { text: 'Протечка на кровле', expected: 'red' },
  { text: 'материал жок задержка', expected: 'red' },
  { text: 'бетон жоқ работы стоят', expected: 'red' },
  { text: 'адам жоқ не вышли', expected: 'red' },
  { text: 'Технадзор не принял', expected: 'red' },
  { text: 'Деформация конструкции', expected: 'red' },

  // YELLOW — должны быть yellow
  { text: 'Есть риск задержки фасада', expected: 'yellow' },
  { text: 'Ждём арматуру пока под вопросом', expected: 'yellow' },
  { text: 'Нужно проверить кровлю', expected: 'yellow' },
  { text: 'Возможно не успеем завтра', expected: 'yellow' },
  { text: 'тексеру керек кровля', expected: 'yellow' },

  // GREEN — должны быть green
  { text: 'Фасад сделали готово', expected: 'green' },
  { text: 'Бетон привезли начинаем', expected: 'green' },
  { text: 'Кровлю завершили всё по плану', expected: 'green' },
  { text: 'дайын', expected: 'green' },
  { text: 'Протечку устранили готово', expected: 'green' },

  // КОНФЛИКТЫ — RED должен побеждать
  { text: 'Бетон привезли но фасад не закончили', expected: 'red' },
  { text: 'Часть сделали но не успели', expected: 'red' },
  { text: 'Кровлю не сделали готово', expected: 'red' },
]

function run() {
  let ok = 0
  let fail = 0

  for (const tc of TEST_CASES) {
    const out = __detectStateForTest(tc.text)
    const got = out.color
    const pass = got === tc.expected
    if (pass) ok += 1
    else fail += 1
    // eslint-disable-next-line no-console
    console.log(pass ? 'OK' : 'FAIL', { text: tc.text, expected: tc.expected, got, confidence: out.confidence, reason: out.reason })
  }

  // eslint-disable-next-line no-console
  console.log('RESULT', { ok, fail, total: TEST_CASES.length })
  if (fail > 0) process.exitCode = 1
}

run()

