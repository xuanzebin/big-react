import fs from 'fs'
import path from 'path'
import cjs from '@rollup/plugin-commonjs'
import ts from 'rollup-plugin-typescript2'

const pkgPath = path.resolve(__dirname, '../../packages')
const distPath = path.resolve(__dirname, '../../dist/node_modules')

export function resolvePkgPath(pkgName, isDist = false) {
	if (isDist) {
		return path.resolve(distPath, pkgName)
	}

	return path.resolve(pkgPath, pkgName)
}

export function getPkgJson(pkgName) {
	const pkgPath = `${resolvePkgPath(pkgName)}/package.json`
	const content = fs.readFileSync(pkgPath, { encoding: 'utf-8' })

	return JSON.parse(content)
}

export function getBaseRollupPlugins({ typescript = {} } = {}) {
	return [cjs(), ts(typescript)]
}
