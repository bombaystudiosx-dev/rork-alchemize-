//
//  Item.swift
//  ManifestationApp
//
//  Created by Rork on April 3, 2026.
//

import Foundation
import SwiftData

@Model
final class Item {
    var timestamp: Date

    init(timestamp: Date) {
        self.timestamp = timestamp
    }
}
