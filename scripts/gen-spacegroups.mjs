import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const HALL_230 = [
  [1, 'P 1', 'p_1'],
  [2, 'P -1', '-p_1'],
  [3, 'P 2', 'p_2y'],
  [4, 'P 21', 'p_2yb'],
  [5, 'C 2', 'c_2y'],
  [6, 'P m', 'p_-2y'],
  [7, 'P c', 'p_-2yc'],
  [8, 'C m', 'c_-2y'],
  [9, 'C c', 'c_-2yc'],
  [10, 'P 2/m', '-p_2y'],
  [11, 'P 21/m', '-p_2yb'],
  [12, 'C 2/m', '-c_2y'],
  [13, 'P 2/c', '-p_2yc'],
  [14, 'P 21/c', '-p_2ybc'],
  [15, 'C 2/c', '-c_2yc'],
  [16, 'P 2 2 2', 'p_2_2'],
  [17, 'P 2 2 21', 'p_2c_2'],
  [18, 'P 21 21 2', 'p_2_2ab'],
  [19, 'P 21 21 21', 'p_2ac_2ab'],
  [20, 'C 2 2 21', 'c_2c_2'],
  [21, 'C 2 2 2', 'c_2_2'],
  [22, 'F 2 2 2', 'f_2_2'],
  [23, 'I 2 2 2', 'i_2_2'],
  [24, 'I 21 21 21', 'i_2b_2c'],
  [25, 'P m m 2', 'p_2_-2'],
  [26, 'P m c 21', 'p_2c_-2'],
  [27, 'P c c 2', 'p_2_-2c'],
  [28, 'P m a 2', 'p_2_-2a'],
  [29, 'P c a 21', 'p_2c_-2ac'],
  [30, 'P n c 2', 'p_2_-2bc'],
  [31, 'P m n 21', 'p_2ac_-2'],
  [32, 'P b a 2', 'p_2_-2ab'],
  [33, 'P n a 21', 'p_2c_-2n'],
  [34, 'P n n 2', 'p_2_-2n'],
  [35, 'C m m 2', 'c_2_-2'],
  [36, 'C m c 21', 'c_2c_-2'],
  [37, 'C c c 2', 'c_2_-2c'],
  [38, 'A m m 2', 'a_2_-2'],
  [39, 'A b m 2', 'a_2_-2b'],
  [40, 'A m a 2', 'a_2_-2a'],
  [41, 'A b a 2', 'a_2_-2ab'],
  [42, 'F m m 2', 'f_2_-2'],
  [43, 'F d d 2', 'f_2_-2d'],
  [44, 'I m m 2', 'i_2_-2'],
  [45, 'I b a 2', 'i_2_-2c'],
  [46, 'I m a 2', 'i_2_-2a'],
  [47, 'P m m m', '-p_2_2'],
  [48, 'P n n n', '-p_2ab_2bc'],
  [49, 'P c c m', '-p_2_2c'],
  [50, 'P b a n', '-p_2ab_2b'],
  [51, 'P m m a', '-p_2a_2a'],
  [52, 'P n n a', '-p_2a_2bc'],
  [53, 'P m n a', '-p_2ac_2'],
  [54, 'P c c a', '-p_2a_2ac'],
  [55, 'P b a m', '-p_2_2ab'],
  [56, 'P c c n', '-p_2ab_2ac'],
  [57, 'P b c m', '-p_2c_2b'],
  [58, 'P n n m', '-p_2_2n'],
  [59, 'P m m n', '-p_2ab_2a'],
  [60, 'P b c n', '-p_2n_2ab'],
  [61, 'P b c a', '-p_2ac_2ab'],
  [62, 'P n m a', '-p_2ac_2n'],
  [63, 'C m c m', '-c_2c_2'],
  [64, 'C m c a', '-c_2ac_2'],
  [65, 'C m m m', '-c_2_2'],
  [66, 'C c c m', '-c_2_2c'],
  [67, 'C m m a', '-c_2a_2'],
  [68, 'C c c a', '-c_2a_2ac'],
  [69, 'F m m m', '-f_2_2'],
  [70, 'F d d d', '-f_2uv_2vw'],
  [71, 'I m m m', '-i_2_2'],
  [72, 'I b a m', '-i_2_2c'],
  [73, 'I b c a', '-i_2b_2c'],
  [74, 'I m m a', '-i_2b_2'],
  [75, 'P 4', 'p_4'],
  [76, 'P 41', 'p_4w'],
  [77, 'P 42', 'p_4c'],
  [78, 'P 43', 'p_4cw'],
  [79, 'I 4', 'i_4'],
  [80, 'I 41', 'i_4bw'],
  [81, 'P -4', 'p_-4'],
  [82, 'I -4', 'i_-4'],
  [83, 'P 4/m', '-p_4'],
  [84, 'P 42/m', '-p_4c'],
  [85, 'P 4/n', '-p_4a'],
  [86, 'P 42/n', '-p_4bc'],
  [87, 'I 4/m', '-i_4'],
  [88, 'I 41/a', '-i_4ad'],
  [89, 'P 4 2 2', 'p_4_2'],
  [90, 'P 4 21 2', 'p_4ab_2ab'],
  [91, 'P 41 2 2', 'p_4w_2c'],
  [92, 'P 41 21 2', 'p_4abw_2nw'],
  [93, 'P 42 2 2', 'p_4c_2'],
  [94, 'P 42 21 2', 'p_4n_2n'],
  [95, 'P 43 2 2', 'p_4cw_2c'],
  [96, 'P 43 21 2', 'p_4nw_2abw'],
  [97, 'I 4 2 2', 'i_4_2'],
  [98, 'I 41 2 2', 'i_4bw_2bw'],
  [99, 'P 4 m m', 'p_4_-2'],
  [100, 'P 4 b m', 'p_4_-2ab'],
  [101, 'P 42 c m', 'p_4c_-2c'],
  [102, 'P 42 n m', 'p_4n_-2n'],
  [103, 'P 4 c c', 'p_4_-2c'],
  [104, 'P 4 n c', 'p_4_-2n'],
  [105, 'P 42 m c', 'p_4c_-2'],
  [106, 'P 42 b c', 'p_4c_-2ab'],
  [107, 'I 4 m m', 'i_4_-2'],
  [108, 'I 4 c m', 'i_4_-2c'],
  [109, 'I 41 m d', 'i_4bw_-2'],
  [110, 'I 41 c d', 'i_4bw_-2c'],
  [111, 'P -4 2 m', 'p_-4_2'],
  [112, 'P -4 2 c', 'p_-4_2c'],
  [113, 'P -4 21 m', 'p_-4_2ab'],
  [114, 'P -4 21 c', 'p_-4_2n'],
  [115, 'P -4 m 2', 'p_-4_-2'],
  [116, 'P -4 c 2', 'p_-4_-2c'],
  [117, 'P -4 b 2', 'p_-4_-2ab'],
  [118, 'P -4 n 2', 'p_-4_-2n'],
  [119, 'I -4 m 2', 'i_-4_-2'],
  [120, 'I -4 c 2', 'i_-4_-2c'],
  [121, 'I -4 2 m', 'i_-4_2'],
  [122, 'I -4 2 d', 'i_-4_2bw'],
  [123, 'P 4/m m m', '-p_4_2'],
  [124, 'P 4/m c c', '-p_4_2c'],
  [125, 'P 4/n b m', '-p_4a_2b'],
  [126, 'P 4/n n c', '-p_4a_2bc'],
  [127, 'P 4/m b m', '-p_4_2ab'],
  [128, 'P 4/m n c', '-p_4_2n'],
  [129, 'P 4/n m m', '-p_4a_2a'],
  [130, 'P 4/n c c', '-p_4a_2ac'],
  [131, 'P 42/m m c', '-p_4c_2'],
  [132, 'P 42/m c m', '-p_4c_2c'],
  [133, 'P 42/n b c', '-p_4ac_2b'],
  [134, 'P 42/n n m', '-p_4ac_2bc'],
  [135, 'P 42/m b c', '-p_4c_2ab'],
  [136, 'P 42/m n m', '-p_4n_2n'],
  [137, 'P 42/n m c', '-p_4ac_2a'],
  [138, 'P 42/n c m', '-p_4ac_2ac'],
  [139, 'I 4/m m m', '-i_4_2'],
  [140, 'I 4/m c m', '-i_4_2c'],
  [141, 'I 41/a m d', '-i_4bd_2'],
  [142, 'I 41/a c d', '-i_4bd_2c'],
  [143, 'P 3', 'p_3'],
  [144, 'P 31', 'p_31'],
  [145, 'P 32', 'p_32'],
  [146, 'R 3', 'r_3'],
  [147, 'P -3', '-p_3'],
  [148, 'R -3', '-r_3'],
  [149, 'P 3 1 2', 'p_3_2'],
  [150, 'P 3 2 1', 'p_3_2"'],
  [151, 'P 31 1 2', 'p_31_2_(0_0_4)'],
  [152, 'P 31 2 1', 'p_31_2"'],
  [153, 'P 32 1 2', 'p_32_2_(0_0_2)'],
  [154, 'P 32 2 1', 'p_32_2"'],
  [155, 'R 32', 'r_3_2"'],
  [156, 'P 3 m 1', 'p_3_-2"'],
  [157, 'P 3 1 m', 'p_3_-2'],
  [158, 'P 3 c 1', 'p_3_-2"c'],
  [159, 'P 3 1 c', 'p_3_-2c'],
  [160, 'R 3 m', 'r_3_-2"'],
  [161, 'R 3 c', 'r_3_-2"c'],
  [162, 'P -3 1 m', '-p_3_2'],
  [163, 'P -3 1 c', '-p_3_2c'],
  [164, 'P -3 m 1', '-p_3_2"'],
  [165, 'P -3 c 1', '-p_3_2"c'],
  [166, 'R -3 m', '-r_3_2"'],
  [167, 'R -3 c', '-r_3_2"c'],
  [168, 'P 6', 'p_6'],
  [169, 'P 61', 'p_61'],
  [170, 'P 65', 'p_65'],
  [171, 'P 62', 'p_62'],
  [172, 'P 64', 'p_64'],
  [173, 'P 63', 'p_6c'],
  [174, 'P -6', 'p_-6'],
  [175, 'P 6/m', '-p_6'],
  [176, 'P 63/m', '-p_6c'],
  [177, 'P 6 2 2', 'p_6_2'],
  [178, 'P 61 2 2', 'p_61_2_(0_0_5)'],
  [179, 'P 65 2 2', 'p_65_2_(0_0_1)'],
  [180, 'P 62 2 2', 'p_62_2_(0_0_4)'],
  [181, 'P 64 2 2', 'p_64_2_(0_0_2)'],
  [182, 'P 63 2 2', 'p_6c_2c'],
  [183, 'P 6 m m', 'p_6_-2'],
  [184, 'P 6 c c', 'p_6_-2c'],
  [185, 'P 63 c m', 'p_6c_-2'],
  [186, 'P 63 m c', 'p_6c_-2c'],
  [187, 'P -6 m 2', 'p_-6_2'],
  [188, 'P -6 c 2', 'p_-6c_2'],
  [189, 'P -6 2 m', 'p_-6_-2'],
  [190, 'P -6 2 c', 'p_-6c_-2c'],
  [191, 'P 6/m m m', '-p_6_2'],
  [192, 'P 6/m c c', '-p_6_2c'],
  [193, 'P 63/m c m', '-p_6c_2'],
  [194, 'P 63/m m c', '-p_6c_2c'],
  [195, 'P 2 3', 'p_2_2_3'],
  [196, 'F 2 3', 'f_2_2_3'],
  [197, 'I 2 3', 'i_2_2_3'],
  [198, 'P 21 3', 'p_2ac_2ab_3'],
  [199, 'I 21 3', 'i_2b_2c_3'],
  [200, 'P m -3', '-p_2_2_3'],
  [201, 'P n -3', '-p_2ab_2bc_3'],
  [202, 'F m -3', '-f_2_2_3'],
  [203, 'F d -3', '-f_2uv_2vw_3'],
  [204, 'I m -3', '-i_2_2_3'],
  [205, 'P a -3', '-p_2ac_2ab_3'],
  [206, 'I a -3', '-i_2b_2c_3'],
  [207, 'P 4 3 2', 'p_4_2_3'],
  [208, 'P 42 3 2', 'p_4n_2_3'],
  [209, 'F 4 3 2', 'f_4_2_3'],
  [210, 'F 41 3 2', 'f_4d_2_3'],
  [211, 'I 4 3 2', 'i_4_2_3'],
  [212, 'P 43 3 2', 'p_4acd_2ab_3'],
  [213, 'P 41 3 2', 'p_4bd_2ab_3'],
  [214, 'I 41 3 2', 'i_4bd_2c_3'],
  [215, 'P -4 3 m', 'p_-4_2_3'],
  [216, 'F -4 3 m', 'f_-4_2_3'],
  [217, 'I -4 3 m', 'i_-4_2_3'],
  [218, 'P -4 3 n', 'p_-4n_2_3'],
  [219, 'F -4 3 c', 'f_-4a_2_3'],
  [220, 'I -4 3 d', 'i_-4bd_2c_3'],
  [221, 'P m -3 m', '-p_4_2_3'],
  [222, 'P n -3 n', '-p_4a_2bc_3'],
  [223, 'P m -3 n', '-p_4n_2_3'],
  [224, 'P n -3 m', '-p_4bc_2bc_3'],
  [225, 'F m -3 m', '-f_4_2_3'],
  [226, 'F m -3 c', '-f_4a_2_3'],
  [227, 'F d -3 m', '-f_4vw_2vw_3'],
  [228, 'F d -3 c', '-f_4ud_2vw_3'],
  [229, 'I m -3 m', '-i_4_2_3'],
  [230, 'I a -3 d', '-i_4bd_2c_3'],
]

const ROT_PRINCIPAL = {
  x: {
    1: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    2: [[1, 0, 0], [0, -1, 0], [0, 0, -1]],
    3: [[1, 0, 0], [0, 0, -1], [0, 1, -1]],
    4: [[1, 0, 0], [0, 0, -1], [0, 1, 0]],
    6: [[1, 0, 0], [0, 1, -1], [0, 1, 0]],
  },
  y: {
    1: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    2: [[-1, 0, 0], [0, 1, 0], [0, 0, -1]],
    3: [[-1, 0, 1], [0, 1, 0], [-1, 0, 0]],
    4: [[0, 0, 1], [0, 1, 0], [-1, 0, 0]],
    6: [[0, 0, 1], [0, 1, 0], [-1, 0, 1]],
  },
  z: {
    1: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    2: [[-1, 0, 0], [0, -1, 0], [0, 0, 1]],
    3: [[0, -1, 0], [1, -1, 0], [0, 0, 1]],
    4: [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
    6: [[1, -1, 0], [1, 0, 0], [0, 0, 1]],
  },
}

const ROT_FACE_DIAGONAL = {
  x: {
    "'": [[-1, 0, 0], [0, 0, -1], [0, -1, 0]],
    '"': [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
  },
  y: {
    "'": [[0, 0, -1], [0, -1, 0], [-1, 0, 0]],
    '"': [[0, 0, 1], [0, -1, 0], [1, 0, 0]],
  },
  z: {
    "'": [[0, -1, 0], [-1, 0, 0], [0, 0, -1]],
    '"': [[0, 1, 0], [1, 0, 0], [0, 0, -1]],
  },
}

const ROT_BODY_DIAGONAL = [[0, 0, 1], [1, 0, 0], [0, 1, 0]]

const LATTICE_TRANSLATIONS = {
  P: [],
  A: [[0, 6, 6]],
  B: [[6, 0, 6]],
  C: [[6, 6, 0]],
  I: [[6, 6, 6]],
  F: [[0, 6, 6], [6, 0, 6], [6, 6, 0]],
  R: [[8, 4, 4], [4, 8, 8]],
}

const LETTER_TRANSLATIONS = {
  a: [6, 0, 0],
  b: [0, 6, 0],
  c: [0, 0, 6],
  n: [6, 6, 6],
  u: [3, 0, 0],
  v: [0, 3, 0],
  w: [0, 0, 3],
  d: [3, 3, 3],
}

function mulMat(a, b) {
  const r = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      r[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j]
    }
  }
  return r
}

function applyMat(m, v) {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ]
}

function mod12(v) {
  return v.map((x) => ((x % 12) + 12) % 12)
}

function compose(op1, op2) {
  return { r: mulMat(op1.r, op2.r), t: mod12(applyMat(op1.r, op2.t).map((x, i) => x + op1.t[i])) }
}

function sameOp(a, b) {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (a.r[i][j] !== b.r[i][j]) return false
    }
    if (a.t[i] !== b.t[i]) return false
  }
  return true
}

function closure(generators) {
  const list = [{ r: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], t: [0, 0, 0] }]
  for (const g of generators) {
    if (!list.some((op) => sameOp(op, g))) list.push(g)
  }
  for (let i = 0; i < list.length; i++) {
    for (let j = 0; j < list.length; j++) {
      const c = compose(list[i], list[j])
      if (!list.some((op) => sameOp(op, c))) list.push(c)
    }
  }
  return list
}

function parseRotationToken(token, prev, position) {
  let i = 0
  let neg = false
  if (token[0] === '-') {
    neg = true
    i = 1
  }
  const n = parseInt(token[i], 10)
  i++
  let axis = null
  let numericT = null
  const letters = []
  for (; i < token.length; i++) {
    const ch = token[i]
    if (ch === 'x' || ch === 'y' || ch === 'z') axis = ch
    else if (ch === "'" || ch === '"' || ch === '*') axis = ch
    else if (ch >= '1' && ch <= '5') numericT = parseInt(ch, 10)
    else if ('abcnuvwd'.includes(ch)) letters.push(ch)
    else throw new Error(`Hall 符号含未知字符：${token} @ ${ch}`)
  }

  let rot
  let axisDir
  let resolvedAxis
  if (axis === 'x' || axis === 'y' || axis === 'z') {
    rot = ROT_PRINCIPAL[axis][n]
    axisDir = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }[axis]
    resolvedAxis = axis
  } else if (axis === "'" || axis === '"') {
    const prevAxis = prev?.resolvedAxis
    if (prevAxis !== 'x' && prevAxis !== 'y' && prevAxis !== 'z') {
      throw new Error(`面对角 2 次旋转需要前序主轴：${token}`)
    }
    rot = ROT_FACE_DIAGONAL[prevAxis][axis]
    axisDir = null
    resolvedAxis = prevAxis
  } else if (axis === '*') {
    rot = ROT_BODY_DIAGONAL
    axisDir = [1, 1, 1]
    resolvedAxis = 'z'
  } else if (position === 1) {
    rot = ROT_PRINCIPAL.z[n]
    axisDir = [0, 0, 1]
    resolvedAxis = 'z'
  } else if (position === 2 && n === 2) {
    if (prev.n === 3 || prev.n === 6) {
      rot = ROT_FACE_DIAGONAL.z["'"]
      resolvedAxis = 'z'
    } else {
      rot = ROT_PRINCIPAL.x[2]
      axisDir = [1, 0, 0]
      resolvedAxis = 'x'
    }
  } else if (n === 3) {
    rot = ROT_BODY_DIAGONAL
    axisDir = [1, 1, 1]
    resolvedAxis = 'z'
  } else {
    rot = ROT_PRINCIPAL.z[n]
    axisDir = [0, 0, 1]
    resolvedAxis = 'z'
  }

  let r = rot.map((row) => [...row])
  if (neg) r = r.map((row) => row.map((x) => -x))

  let t = [0, 0, 0]
  if (numericT !== null) {
    if (!axisDir) throw new Error(`数字平移需要轴向：${token}`)
    const k = numericT / n
    t = axisDir.map((d) => Math.round(d * k * 12))
  }
  for (const letter of letters) {
    const lt = LETTER_TRANSLATIONS[letter]
    t = [t[0] + lt[0], t[1] + lt[1], t[2] + lt[2]]
  }

  return { r, t, n, resolvedAxis }
}

function parseHallSymbol(hall) {
  const s = hall.replace(/_/g, ' ').trim()
  let v = [0, 0, 0]
  let body = s
  const vMatch = s.match(/\(\s*(-?\d+)\s+(-?\d+)\s+(-?\d+)\s*\)/)
  if (vMatch) {
    v = [Math.round((+vMatch[1] / 12) * 12), Math.round((+vMatch[2] / 12) * 12), Math.round((+vMatch[3] / 12) * 12)]
    body = s.replace(/\(.*\)/, '').trim()
  }
  const tokens = body.split(/\s+/).filter(Boolean)
  const head = tokens[0]
  const negativeLattice = head.startsWith('-')
  const lattice = (negativeLattice ? head.slice(1) : head).toUpperCase()
  const generators = []
  for (const translation of LATTICE_TRANSLATIONS[lattice] ?? []) {
    generators.push({ r: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], t: [...translation] })
    if (negativeLattice) {
      generators.push({ r: [[-1, 0, 0], [0, -1, 0], [0, 0, -1]], t: [...translation] })
    }
  }
  if (negativeLattice && LATTICE_TRANSLATIONS[lattice].length === 0) {
    generators.push({ r: [[-1, 0, 0], [0, -1, 0], [0, 0, -1]], t: [0, 0, 0] })
  }
  let prev = null
  for (let k = 1; k < tokens.length; k++) {
    const parsed = parseRotationToken(tokens[k], prev, k)
    prev = parsed
    generators.push({ r: parsed.r, t: mod12(parsed.t) })
  }
  if (v.some((x) => x !== 0)) {
    for (const g of generators) {
      g.t = mod12(g.t.map((x, i) => x + v[i] - applyMat(g.r, v)[i]))
    }
  }
  return generators
}

function termFor(coef, varName) {
  if (coef === 0) return ''
  const sign = coef > 0 ? '+' : '-'
  const magnitude = Math.abs(coef)
  const magnitudeStr = magnitude === 1 ? '' : String(magnitude)
  return `${sign}${magnitudeStr}${varName}`
}

function constantFor(twelfths) {
  if (twelfths === 0) return ''
  const reduced = [
    [6, '1/2'],
    [3, '1/4'],
    [9, '3/4'],
    [4, '1/3'],
    [8, '2/3'],
    [2, '1/6'],
    [10, '5/6'],
    [1, '1/12'],
    [5, '5/12'],
    [7, '7/12'],
    [11, '11/12'],
  ]
  const hit = reduced.find(([num]) => num === twelfths)
  return `+${hit ? hit[1] : `${twelfths}/12`}`
}

function opToXyz(op) {
  const parts = []
  const vars = ['x', 'y', 'z']
  for (let i = 0; i < 3; i++) {
    let expr = ''
    for (let j = 0; j < 3; j++) {
      expr += termFor(op.r[i][j], vars[j])
    }
    expr += constantFor(op.t[i])
    const cleaned = expr.startsWith('+') ? expr.slice(1) : expr
    parts.push(cleaned === '' ? '0' : cleaned)
  }
  return parts.join(',')
}

function generate() {
  const result = {}
  for (const [number, hm, hall] of HALL_230) {
    const generators = parseHallSymbol(hall)
    const ops = closure(generators)
    ops.sort((a, b) => {
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (a.r[i][j] !== b.r[i][j]) return a.r[i][j] - b.r[i][j]
        }
      }
      for (let i = 0; i < 3; i++) {
        if (a.t[i] !== b.t[i]) return a.t[i] - b.t[i]
      }
      return 0
    })
    result[number] = { hm, number, ops: ops.map(opToXyz) }
  }
  return result
}

const LATTICE_ORDER_COUNT = { P: 1, A: 2, B: 2, C: 2, I: 2, F: 4, R: 3 }
const POINT_GROUP_ORDER = {
  1: 1, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2, 8: 2, 9: 2, 10: 4, 11: 4, 12: 4, 13: 4, 14: 4, 15: 4,
  16: 4, 17: 4, 18: 4, 19: 4, 20: 4, 21: 4, 22: 4, 23: 4, 24: 4, 25: 4, 26: 4, 27: 4, 28: 4, 29: 4, 30: 4,
  31: 4, 32: 4, 33: 4, 34: 4, 35: 4, 36: 4, 37: 4, 38: 4, 39: 4, 40: 4, 41: 4, 42: 4, 43: 4, 44: 4, 45: 4, 46: 4,
  47: 8, 48: 8, 49: 8, 50: 8, 51: 8, 52: 8, 53: 8, 54: 8, 55: 8, 56: 8, 57: 8, 58: 8, 59: 8, 60: 8, 61: 8, 62: 8,
  63: 8, 64: 8, 65: 8, 66: 8, 67: 8, 68: 8, 69: 8, 70: 8, 71: 8, 72: 8, 73: 8, 74: 8,
  75: 4, 76: 4, 77: 4, 78: 4, 79: 4, 80: 4, 81: 4, 82: 4, 83: 8, 84: 8, 85: 8, 86: 8, 87: 8, 88: 8,
  89: 8, 90: 8, 91: 8, 92: 8, 93: 8, 94: 8, 95: 8, 96: 8, 97: 8, 98: 8, 99: 8, 100: 8, 101: 8, 102: 8, 103: 8, 104: 8,
  105: 8, 106: 8, 107: 8, 108: 8, 109: 8, 110: 8, 111: 8, 112: 8, 113: 8, 114: 8, 115: 8, 116: 8, 117: 8, 118: 8,
  119: 8, 120: 8, 121: 8, 122: 8, 123: 16, 124: 16, 125: 16, 126: 16, 127: 16, 128: 16, 129: 16, 130: 16, 131: 16,
  132: 16, 133: 16, 134: 16, 135: 16, 136: 16, 137: 16, 138: 16, 139: 16, 140: 16, 141: 16, 142: 16,
  143: 3, 144: 3, 145: 3, 146: 3, 147: 6, 148: 6, 149: 6, 150: 6, 151: 6, 152: 6, 153: 6, 154: 6, 155: 6,
  156: 6, 157: 6, 158: 6, 159: 6, 160: 6, 161: 6, 162: 12, 163: 12, 164: 12, 165: 12, 166: 12, 167: 12,
  168: 6, 169: 6, 170: 6, 171: 6, 172: 6, 173: 6, 174: 6, 175: 12, 176: 12, 177: 12, 178: 12, 179: 12,
  180: 12, 181: 12, 182: 12, 183: 12, 184: 12, 185: 12, 186: 12, 187: 12, 188: 12, 189: 12, 190: 12,
  191: 24, 192: 24, 193: 24, 194: 24,
  195: 12, 196: 12, 197: 12, 198: 12, 199: 12, 200: 24, 201: 24, 202: 24, 203: 24, 204: 24, 205: 24, 206: 24,
  207: 24, 208: 24, 209: 24, 210: 24, 211: 24, 212: 24, 213: 24, 214: 24, 215: 24, 216: 24, 217: 24, 218: 24,
  219: 24, 220: 24, 221: 48, 222: 48, 223: 48, 224: 48, 225: 48, 226: 48, 227: 48, 228: 48, 229: 48, 230: 48,
}

const table = generate()

function runMain() {
  const failures = []
  for (const [number, , hall] of HALL_230) {
    const lattice = hall.replace(/_/g, ' ').split(' ')[0].replace('-', '').toUpperCase()
    const expected = (LATTICE_ORDER_COUNT[lattice] ?? 0) * (POINT_GROUP_ORDER[number] ?? 0)
    const actual = table[number].ops.length
    if (expected !== actual) {
      failures.push(`#${number} ${hall}: 阶数 ${actual} ≠ 期望 ${expected}`)
    }
  }

  const anchors = [
    [1, 1],
    [2, 2],
    [14, 4],
    [146, 9],
    [194, 24],
    [221, 48],
    [225, 192],
    [227, 192],
    [229, 96],
    [230, 96],
  ]
  for (const [n, expected] of anchors) {
    const actual = table[n].ops.length
    if (actual !== expected) failures.push(`锚点 #${n}: ${actual} ≠ ${expected}`)
  }

  if (failures.length > 0) {
    console.error('空间群表校验失败：')
    for (const f of failures) console.error('  ' + f)
    process.exit(1)
  }

  const lines = []
  lines.push('// 构建期生成：node scripts/gen-spacegroups.mjs')
  lines.push('// 数据源：International Tables for Crystallography Vol. B (2001) Table A1.4.2.7 Hall symbols')
  lines.push('// 算法：Hall 符号 -> 生成元（整数矩阵 + 1/12 单位平移）-> 群闭包 -> xyz 字符串')
  lines.push('// 标准设定：单斜 unique b cell choice 1；origin choice 2；R 群六方坐标')
  lines.push('')
  lines.push('export interface SpaceGroupEntry {')
  lines.push('  hm: string')
  lines.push('  number: number')
  lines.push('  ops: string[]')
  lines.push('}')
  lines.push('')
  lines.push('export const SPACE_GROUPS: Record<number, SpaceGroupEntry> = {')
  for (const [number, , hall] of HALL_230) {
    const entry = table[number]
    lines.push(`  ${number}: { hm: ${JSON.stringify(entry.hm)}, number: ${number}, ops: ${JSON.stringify(entry.ops)} },`)
  }
  lines.push('}')
  lines.push('')

  const hmIndex = new Map()
  for (const [number, , hall] of HALL_230) {
    const normalized = table[number].hm.toLowerCase().replace(/\s/g, '')
    if (hmIndex.has(normalized) && hmIndex.get(normalized) !== number) {
      throw new Error(`H-M 短符号冲突：${normalized} -> ${hmIndex.get(normalized)} 与 ${number}`)
    }
    hmIndex.set(normalized, number)
  }
  lines.push('export const HM_INDEX: Record<string, number> = {')
  for (const [hm, number] of hmIndex) {
    lines.push(`  ${JSON.stringify(hm)}: ${number},`)
  }
  lines.push('}')
  lines.push('')

  const target = join(process.cwd(), 'electron', 'cif', 'spaceGroups.ts')
  writeFileSync(target, lines.join('\n') + '\n', 'utf8')
  console.log(`已生成 ${target}（230 群，全量阶数校验通过）`)
}

const isMain =
  process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/').replace(/^\/+/, '')}`

if (isMain) runMain()

export { parseHallSymbol, closure, opToXyz }
