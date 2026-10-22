import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen } from 'lucide-react'
import styles from './HomePage.module.css'

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <section className={styles.hero} aria-labelledby="home-title">
        <p className={styles.eyebrow}>Interactive algorithm visualizer</p>
        <h1 id="home-title" className={styles.title}>
          Depth First Search : 8 - Puzzle Solver
        </h1>

        <div className={styles.intro}>
          <h2 className={styles.heading}>Watch the stack think.</h2>
          <p className={styles.subheading}>
            Follow every push, pop and backtrack as depth-first search explores the 8-puzzle. Step
            through a run, inspect the frontier, or read how the algorithm works before you begin.
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
