import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen } from 'lucide-react'
import styles from './HomePage.module.css'

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <section className={styles.hero} aria-labelledby="home-title">
        <p className={styles.eyebrow}>BCSE308L - Artificial Intelligence</p>
        <h1 id="home-title" className={styles.title}>
          Depth First Search &nbsp;8 - Puzzle Solver
        </h1>
        <hr style={{width:'50%', margin: '2.5rem auto 1.5rem', border:"1px solid #4e46e51f"}}></hr>
        <div >
          <h2 className={styles.heading}>Karthik B</h2>
          <h4 className={styles.subheading} style={{color: '#5e58cc'}}>24BCE2592</h4>
        </div>

        <hr style={{width: '50%', margin: '2.5rem auto 0.5rem', border:"1px solid #4e46e51f"}}></hr>

        <div className={styles.intro}>
          <h2 className={styles.heading}>8 Puzzle</h2>
          <p className={styles.subheading} style={{textAlign: 'justify'}}>
            The 8-puzzle is a sliding-tile puzzle played on a 3×3 grid. Eight numbered tiles occupy
            eight of the nine squares, leaving one blank square. A move slides a tile adjacent to
            the blank into that empty space. Starting from an initial arrangement, the goal is to
            reach a specified target arrangement.
          </p>
          </div>

        <div className={styles.actions}>
          <Link to="/visualizer" className={styles.primary}>
            Open the visualizer
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link to="/learn" className={styles.secondary}>
            <BookOpen size={16} aria-hidden="true" />
            Learn the algorithm
          </Link>
        </div>
      </section>
    </main>
  )
}
