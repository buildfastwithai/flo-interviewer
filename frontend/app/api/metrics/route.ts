import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    const metricsData = await request.json()
    
    // Convert to pretty-printed JSON
    const jsonString = JSON.stringify(metricsData, null, 2)
    
    // Write to metrics.json file
    const filePath = join(process.cwd(), 'hooks', 'metrics.json')
    await writeFile(filePath, jsonString, 'utf-8')
    
    return NextResponse.json({ success: true, message: 'Metrics saved successfully' })
  } catch (error) {
    console.error('Error saving metrics:', error)
    return NextResponse.json(
      { error: 'Failed to save metrics' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const { readFile } = await import('fs/promises')
    const { join } = await import('path')
    
    const filePath = join(process.cwd(), 'hooks', 'metrics.json')
    const fileContent = await readFile(filePath, 'utf-8')
    const metricsData = JSON.parse(fileContent)
    
    return NextResponse.json(metricsData)
  } catch (error) {
    console.error('Error reading metrics:', error)
    return NextResponse.json(
      { error: 'Failed to read metrics' },
      { status: 500 }
    )
  }
} 