import type { FC } from 'react'

export type HamburgerMenuProps = {
    sections: string[]
    activeSection: string
    // onSectionClick: (section: string) => void
    onClose: () => void
    handleNavClick: (section: string) => void
}

export const HamburgerMenu: FC<HamburgerMenuProps> = ({
    sections,
    activeSection,
    // onSectionClick,
    onClose,
    handleNavClick
}) => {
    return (
        <div className="absolute top-full left-0 w-full bg-white z-50">
            <div className="mx-auto w-[84%] py-6">
                <div className="grid grid-cols-5 gap-4">
                    {sections.map((section) => (
                        <button
                            key={section}
                            onClick={() => {
                                handleNavClick(section)
                                onClose()
                            }}
                            className={`p-3 text-[0.9rem] font-share uppercase text-black transition-colors ${activeSection === section
                                ? 'font-bold bg-gray-100'
                                : 'hover:bg-gray-50'
                                }`}
                        >
                            {section}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
