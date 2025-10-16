import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { decryptAliceBlueAccounts, encryptAliceBlueAccounts } from '@/utils/encryption'

const SETTINGS_FILE = path.join(process.cwd(), 'appsettings.json')

export async function GET() {
  try {
    // Read the settings file
    const settingsData = fs.readFileSync(SETTINGS_FILE, 'utf8')
    const settings = JSON.parse(settingsData)
    
    // If settings are encrypted, decrypt the AliceBlue accounts
    if (settings.IsEncrypted && settings.Settings?.AliceBlueAccounts) {
      settings.Settings.AliceBlueAccounts = decryptAliceBlueAccounts(settings.Settings.AliceBlueAccounts)
    }
    
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error reading settings:', error)
    return NextResponse.json(
      { error: 'Failed to read settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const settings = await request.json()
    
    // Validate the settings structure
    if (!settings.Settings || !settings.Settings.AliceBlueAccounts) {
      return NextResponse.json(
        { error: 'Invalid settings structure' },
        { status: 400 }
      )
    }
    
    // Encrypt AliceBlue accounts before saving
    const settingsToSave = {
      ...settings,
      IsEncrypted: true,
      Settings: {
        ...settings.Settings,
        AliceBlueAccounts: encryptAliceBlueAccounts(settings.Settings.AliceBlueAccounts)
      }
    }
    
    // Write the updated settings back to the file
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsToSave, null, 4))
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving settings:', error)
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}
