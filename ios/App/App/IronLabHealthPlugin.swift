import Foundation
import Capacitor
import HealthKit

/**
 * IronLabHealthPlugin
 *
 * Native Capacitor plugin that writes strength workouts to Apple HealthKit.
 * Registered as "IronLabHealth" — matches the registerPlugin() call in useHealthKit.ts.
 *
 * To enable in Xcode:
 *   1. Select the App target → Signing & Capabilities → + Capability → HealthKit
 *   2. Build & run on a real device (HealthKit is not available in Simulator)
 */
@objc(IronLabHealthPlugin)
public class IronLabHealthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "IronLabHealthPlugin"
    public let jsName = "IronLabHealth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "saveStrengthWorkout", returnType: CAPPluginReturnPromise)
    ]

    private let healthStore = HKHealthStore()

    @objc func saveStrengthWorkout(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit is not available on this device")
            return
        }

        guard
            let startDateStr = call.getString("startDate"),
            let endDateStr = call.getString("endDate")
        else {
            call.reject("startDate and endDate are required")
            return
        }

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        guard
            let startDate = formatter.date(from: startDateStr) ?? ISO8601DateFormatter().date(from: startDateStr),
            let endDate = formatter.date(from: endDateStr) ?? ISO8601DateFormatter().date(from: endDateStr)
        else {
            call.reject("Invalid date format — expected ISO 8601")
            return
        }

        let calories = call.getDouble("totalEnergyBurned") ?? 0
        let metadataDict = call.getObject("metadata") as? [String: String] ?? [:]

        // Request write permission
        let workoutType = HKObjectType.workoutType()
        let energyType = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!

        let typesToShare: Set<HKSampleType> = [workoutType, energyType]
        let typesToRead: Set<HKObjectType> = [workoutType]

        healthStore.requestAuthorization(toShare: typesToShare, read: typesToRead) { [weak self] success, error in
            guard let self = self else { return }

            if let error = error {
                call.reject("HealthKit authorization error: \(error.localizedDescription)")
                return
            }

            guard success else {
                call.reject("HealthKit authorization was denied")
                return
            }

            // Build the workout
            let duration = endDate.timeIntervalSince(startDate)

            var workoutEvents: [HKWorkoutEvent] = []

            // Calorie sample
            var totalEnergyBurned: HKQuantity? = nil
            if calories > 0 {
                totalEnergyBurned = HKQuantity(unit: .kilocalorie(), doubleValue: calories)
            }

            // Build metadata
            var hkMetadata: [String: Any] = [
                HKMetadataKeyWasUserEntered: true
            ]
            for (key, value) in metadataDict {
                hkMetadata[key] = value
            }

            // Create workout configuration
            let config = HKWorkoutConfiguration()
            config.activityType = .traditionalStrengthTraining
            config.locationType = .indoor

            let builder = HKWorkoutBuilder(healthStore: self.healthStore, configuration: config, device: .local())

            builder.beginCollection(withStart: startDate) { success, error in
                if let error = error {
                    call.reject("Failed to begin workout collection: \(error.localizedDescription)")
                    return
                }

                // Add energy sample if available
                var samplesToAdd: [HKSample] = []
                if calories > 0 {
                    let energySample = HKQuantitySample(
                        type: energyType,
                        quantity: HKQuantity(unit: .kilocalorie(), doubleValue: calories),
                        start: startDate,
                        end: endDate
                    )
                    samplesToAdd.append(energySample)
                }

                let addSamplesAndFinish = {
                    builder.endCollection(withEnd: endDate) { success, error in
                        if let error = error {
                            call.reject("Failed to end workout collection: \(error.localizedDescription)")
                            return
                        }

                        builder.finishWorkout { workout, error in
                            if let error = error {
                                call.reject("Failed to save workout: \(error.localizedDescription)")
                                return
                            }

                            guard let workout = workout else {
                                call.reject("Workout was nil after save")
                                return
                            }

                            call.resolve([
                                "success": true,
                                "id": workout.uuid.uuidString
                            ])
                        }
                    }
                }

                if samplesToAdd.isEmpty {
                    addSamplesAndFinish()
                } else {
                    builder.add(samplesToAdd) { success, error in
                        addSamplesAndFinish()
                    }
                }
            }
        }
    }
}
