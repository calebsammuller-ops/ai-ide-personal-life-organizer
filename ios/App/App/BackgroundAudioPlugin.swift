import Foundation
import Capacitor
import AVFoundation

@objc(BackgroundAudioPlugin)
public class BackgroundAudioPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BackgroundAudioPlugin"
    public let jsName = "BackgroundAudio"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isActive", returnType: CAPPluginReturnPromise),
    ]

    private var audioSession: AVAudioSession?
    private var silentPlayer: AVAudioPlayer?
    private var isSessionActive = false

    @objc func startSession(_ call: CAPPluginCall) {
        guard !isSessionActive else {
            call.resolve(["started": true])
            return
        }

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(
                .playAndRecord,
                mode: .voiceChat,
                options: [.defaultToSpeaker, .allowBluetooth, .mixWithOthers]
            )
            try session.setActive(true, options: [])
            audioSession = session

            // Play silent audio to keep the session alive when backgrounded
            startSilentAudio()

            isSessionActive = true
            call.resolve(["started": true])
        } catch {
            call.reject("Failed to start audio session: \(error.localizedDescription)")
        }
    }

    @objc func stopSession(_ call: CAPPluginCall) {
        stopSilentAudio()

        do {
            try AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
        } catch {
            // Non-fatal — session may already be inactive
            print("[BackgroundAudio] Warning deactivating session: \(error.localizedDescription)")
        }

        audioSession = nil
        isSessionActive = false
        call.resolve(["stopped": true])
    }

    @objc func isActive(_ call: CAPPluginCall) {
        call.resolve(["active": isSessionActive])
    }

    // MARK: - Silent Audio (keeps background mode alive)

    private func startSilentAudio() {
        // Generate 1 second of silence as WAV data
        let sampleRate: Double = 44100
        let duration: Double = 1.0
        let numSamples = Int(sampleRate * duration)

        var header = createWavHeader(sampleRate: Int(sampleRate), numSamples: numSamples)
        let silenceData = Data(count: numSamples * 2) // 16-bit silence
        header.append(silenceData)

        do {
            silentPlayer = try AVAudioPlayer(data: header)
            silentPlayer?.numberOfLoops = -1 // Loop indefinitely
            silentPlayer?.volume = 0.0
            silentPlayer?.play()
        } catch {
            print("[BackgroundAudio] Failed to start silent audio: \(error.localizedDescription)")
        }
    }

    private func stopSilentAudio() {
        silentPlayer?.stop()
        silentPlayer = nil
    }

    private func createWavHeader(sampleRate: Int, numSamples: Int) -> Data {
        let channels: Int16 = 1
        let bitsPerSample: Int16 = 16
        let dataSize = numSamples * Int(channels) * Int(bitsPerSample / 8)
        let fileSize = 36 + dataSize

        var data = Data()
        data.append(contentsOf: "RIFF".utf8)
        data.append(contentsOf: withUnsafeBytes(of: Int32(fileSize).littleEndian) { Array($0) })
        data.append(contentsOf: "WAVE".utf8)
        data.append(contentsOf: "fmt ".utf8)
        data.append(contentsOf: withUnsafeBytes(of: Int32(16).littleEndian) { Array($0) })
        data.append(contentsOf: withUnsafeBytes(of: Int16(1).littleEndian) { Array($0) }) // PCM
        data.append(contentsOf: withUnsafeBytes(of: channels.littleEndian) { Array($0) })
        data.append(contentsOf: withUnsafeBytes(of: Int32(sampleRate).littleEndian) { Array($0) })
        let byteRate = Int32(sampleRate * Int(channels) * Int(bitsPerSample / 8))
        data.append(contentsOf: withUnsafeBytes(of: byteRate.littleEndian) { Array($0) })
        let blockAlign = Int16(Int(channels) * Int(bitsPerSample / 8))
        data.append(contentsOf: withUnsafeBytes(of: blockAlign.littleEndian) { Array($0) })
        data.append(contentsOf: withUnsafeBytes(of: bitsPerSample.littleEndian) { Array($0) })
        data.append(contentsOf: "data".utf8)
        data.append(contentsOf: withUnsafeBytes(of: Int32(dataSize).littleEndian) { Array($0) })

        return data
    }
}
