"use client"

import * as React from "react"
import { Progress } from "./progress"

// Re-export Progress component as ProgressBar for backward compatibility
const ProgressBar = Progress;
ProgressBar.displayName = "ProgressBar"

export { ProgressBar }
