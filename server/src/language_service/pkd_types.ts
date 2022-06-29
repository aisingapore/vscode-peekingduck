/*-----------------------------------------------------------------------------
 * Copyright 2022 AI Singapore
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *----------------------------------------------------------------------------*/

export interface Range {
  /** Character offset at the start of the value. */
  start: number;
  /** Character offset at the end of the value. */
  end: number;
}

/**
 * Parsed PeekingDuck pipeline item containing the value and its corresponding
 * character offset range.
 */
export interface ParsedItem {
  /** The parsed value, can be the node definition or node config keys. */
  readonly value: any;
  /** Character offset range of the parsed value. */
  readonly range: Range;
}
