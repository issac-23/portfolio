import type { ReactNode } from 'react'

interface DeviceProps {
  /** Rendered inside the upper screen. */
  top?: ReactNode
  /** Rendered inside the lower screen. */
  bottom?: ReactNode
}

/**
 * The DSi shell: a lid and a base joined by a hinge, with both screens inset
 * into recessed black bezels.
 *
 * Everything here is chrome. The screens are slots, so the apps that fill them
 * stay unaware of the hardware around them.
 */
export default function Device({ top, bottom }: DeviceProps) {
  return (
    <div className="dsi-device">
      <span className="dsi-shoulder dsi-shoulder-l" aria-hidden="true">L</span>
      <span className="dsi-shoulder dsi-shoulder-r" aria-hidden="true">R</span>

      <div className="dsi-lid">
        <span className="dsi-seam" aria-hidden="true" />
        <span className="dsi-screw" style={{ top: 7, left: 9 }} aria-hidden="true" />
        <span className="dsi-screw" style={{ top: 7, right: 9 }} aria-hidden="true" />

        <div className="dsi-half">
          <div aria-hidden="true">
            <div className="dsi-speaker"><i /></div>
          </div>
          <div className="dsi-frame">
            <div className="dsi-screen">{top}</div>
          </div>
          <div aria-hidden="true">
            <div className="dsi-speaker"><i /></div>
          </div>
        </div>

        <div className="dsi-leds" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M3 9a16 16 0 0 1 18 0M6.5 13a11 11 0 0 1 11 0" />
            <circle cx="12" cy="17.5" r="1.4" fill="currentColor" />
          </svg>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
          </svg>
          <span className="dsi-led-on" />
        </div>
      </div>

      <div className="dsi-hinge" aria-hidden="true">
        <span className="dsi-grille"><i /><i /><i /></span>
        <span className="dsi-hinge-mid">
          <span className="dsi-lens" />
          <span className="dsi-mic"><i />MIC</span>
        </span>
        <span />
      </div>

      <div className="dsi-base">
        <span className="dsi-screw" style={{ bottom: 7, left: 9 }} aria-hidden="true" />
        <span className="dsi-screw" style={{ bottom: 7, right: 9 }} aria-hidden="true" />

        <div className="dsi-half">
          <div aria-hidden="true">
            <div className="dsi-dpad"><i className="u" /><i className="d" /><i className="l" /><i className="r" /></div>
            <div className="dsi-power">
              POWER
              <i>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="M12 3v8" />
                  <path d="M6.2 6.4a8.5 8.5 0 1 0 11.6 0" />
                </svg>
              </i>
            </div>
          </div>

          <div className="dsi-frame">
            <div className="dsi-screen">{bottom}</div>
          </div>

          <div aria-hidden="true">
            <div className="dsi-face">
              <span className="dsi-btn dsi-btn-x">X</span>
              <span className="dsi-btn dsi-btn-y">Y</span>
              <span className="dsi-btn dsi-btn-a">A</span>
              <span className="dsi-btn dsi-btn-b">B</span>
            </div>
            <div className="dsi-startsel">
              <div><i />START</div>
              <div><i />SELECT</div>
            </div>
          </div>
        </div>

        <div className="dsi-edge" aria-hidden="true">
          <span className="dsi-silo"><i />STYLUS</span>
          <span className="dsi-cardslot">CARD<i /></span>
        </div>
      </div>
    </div>
  )
}
