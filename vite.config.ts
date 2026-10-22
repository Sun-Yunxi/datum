import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'

const require = createRequire(import.meta.url)

/**
 * 构建期法律声明插件：
 * 1. 把内置 MiSans 字体的许可协议（src/MiSans/LICENSE-MiSans.txt）随产物输出到 dist/，
 *    满足协议第 3 条第 4 项「在字体的任何副本中保留版权声明和本协议」；
 * 2. 自动收集运行时依赖（含传递依赖）的 LICENSE 文本，生成 dist/THIRD-PARTY-NOTICES.txt。
 */
function legalNotices(): Plugin {
  let root = process.cwd()
  let outDir = 'dist'

  /** 依赖许可文件名匹配：LICENSE / LICENCE / COPYING，可带扩展名或后缀 */
  const LICENSE_FILE = /^(LICEN[CS]E|COPYING)([-._].*)?$/i

  /** 在包目录内查找并读取许可文本 */
  function readLicense(dir: string): string | null {
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      return null
    }
    const name = entries.find((f) => LICENSE_FILE.test(f))
    if (!name) return null
    try {
      return readFileSync(join(dir, name), 'utf8')
    } catch {
      return null
    }
  }

  /** 解析已安装包的目录：直接查顶层 node_modules，未命中时再走模块解析（嵌套/提升） */
  function packageDir(name: string): string | null {
    const direct = join(root, 'node_modules', name)
    if (existsSync(join(direct, 'package.json'))) return direct
    try {
      return dirname(require.resolve(`${name}/package.json`))
    } catch {
      return null
    }
  }

  /** 自顶向下遍历 dependencies，收集所有运行时（含传递）依赖 */
  function collectRuntimeDeps(): Map<string, string> {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    const dirs = new Map<string, string>()
    const queue = Object.keys(pkg.dependencies ?? {})
    while (queue.length) {
      const name = queue.shift() as string
      if (dirs.has(name)) continue
      const dir = packageDir(name)
      if (!dir) continue
      dirs.set(name, dir)
      try {
        const meta = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
        for (const dep of Object.keys(meta.dependencies ?? {})) {
          if (!dirs.has(dep)) queue.push(dep)
        }
      } catch {
        // 包元数据损坏则仅记录自身，不中断构建
      }
    }
    return dirs
  }

  function buildNotices(): string {
    const dirs = collectRuntimeDeps()
    const sections = [...dirs.keys()].sort().map((name) => {
      const dir = dirs.get(name) as string
      let meta: { version?: string; license?: unknown; repository?: unknown; homepage?: unknown } = {}
      try {
        meta = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
      } catch {
        // 忽略
      }
      const license = typeof meta.license === 'string' ? meta.license : 'unknown'
      const repoValue = meta.repository
      const repository =
        typeof repoValue === 'string'
          ? repoValue
          : repoValue && typeof repoValue === 'object' && 'url' in repoValue
            ? String((repoValue as { url?: string }).url ?? '')
            : ''
      const text = readLicense(dir)
      return [
        `${name}@${meta.version ?? 'unknown'}`,
        `License: ${license}`,
        repository ? `Repository: ${repository}` : '',
        '',
        text ?? '!! 未在该依赖包内找到 LICENSE 文件，请查阅该依赖的仓库。',
      ]
        .filter(Boolean)
        .join('\n')
    })

    const header = [
      'THIRD-PARTY SOFTWARE NOTICES',
      '='.repeat(72),
      '本文件由构建过程自动生成（见 vite.config.ts 的 legalNotices 插件），',
      '列出本项目的运行时依赖（含传递依赖）及其许可协议全文。',
      '各依赖版权归其各自作者所有，使用条件以其许可协议为准。',
      '',
      '内置 MiSans 字体不在本文件范围内：其遵循《MiSans 字体知识产权许可协议》，',
      '协议原文见同目录下的 LICENSE-MiSans.txt。',
      '='.repeat(72),
      '',
      '',
    ].join('\n')

    return header + sections.join('\n\n' + '-'.repeat(72) + '\n\n') + '\n'
  }

  return {
    name: 'datum:legal-notices',
    apply: 'build',
    configResolved(config) {
      root = config.root
      outDir = config.build.outDir
    },
    generateBundle() {
      const licensePath = join(root, 'src', 'MiSans', 'LICENSE-MiSans.txt')
      if (!existsSync(licensePath)) {
        this.error(`缺少 MiSans 许可协议文件：${licensePath}（协议要求随字体副本保留）`)
      }
      this.emitFile({
        type: 'asset',
        fileName: 'LICENSE-MiSans.txt',
        source: readFileSync(licensePath, 'utf8'),
      })
    },
    closeBundle() {
      const target = join(root, outDir, 'THIRD-PARTY-NOTICES.txt')
      writeFileSync(target, buildNotices(), 'utf8')
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), legalNotices()],
  server: {
    // 监听所有网卡，允许局域网内其他设备通过 192.168.0.* 访问
    host: true,
    port: 5174,
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    // 第三方库拆分为独立 chunk：其内容随依赖版本变化，与业务代码分离后
    // 业务改动发布时用户可复用缓存的 vendor chunk，减少重复下载
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 20,
            },
            {
              name: 'vendor-mdui',
              test: /node_modules[\\/](@mdui|mdui|@lit|lit|lit-html|lit-element|tslib|classcat)[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
})
