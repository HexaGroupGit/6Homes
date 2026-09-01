import HeroDive from '@/components/HeroDive'
import DomeIntro from '@/components/DomeIntro'
import ServicesLine from '@/components/ServicesLine'
import Scenic from '@/components/Scenic'
import Projects from '@/components/Projects'
import StickyIndex from '@/components/StickyIndex'
import ContactSection from '@/components/ContactSection'
import Footer from '@/components/Footer'

// One page, told as a film: the street under a moving sky, the dome that
// carries the reasons, the work travelling past, the drone pull-back with
// Tom's line, the communities, the process read over the built street, and
// the conversation to start it all. Anchor ids match the old site's nav
// (#about #services #contact) so nothing bookmarked breaks.
export default function HomePage() {
  return (
    <>
      <HeroDive />
      <DomeIntro />
      <ServicesLine />
      <Scenic />
      <Projects />
      <StickyIndex />
      <ContactSection />
      <Footer />
    </>
  )
}
