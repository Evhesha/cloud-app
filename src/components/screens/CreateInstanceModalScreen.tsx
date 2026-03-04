import { Link } from "react-router-dom"

export function CreateInstanceModalScreen() {
  return (
    <section className="modal-screen">
      <div className="modal-backdrop" />
      <div className="instance-modal">
        <header>
          <div>
            <h2>Create New Instance</h2>
            <p>Configure and deploy a new cloud instance to your project.</p>
          </div>
          <Link to="/customer-dashboard">
          <button type="button">Close</button>
          </Link>
        </header>

        <div className="modal-content">
          <label>
            Instance Name
            <input type="text" placeholder="production-api-server" />
          </label>

          <div>
            <h3>Select Operating System Image</h3>
            <div className="selection-grid three">
              <button type="button" className="tile active">
                <strong>Ubuntu 22.04</strong>
                <span>LTS Build</span>
              </button>
              <button type="button" className="tile">
                <strong>CentOS Stream</strong>
                <span>v9.0 Stable</span>
              </button>
              <button type="button" className="tile">
                <strong>Windows Server</strong>
                <span>2022 Datacenter</span>
              </button>
            </div>
          </div>

          <div>
            <h3>Instance Flavor</h3>
            <div className="selection-list">
              <button type="button" className="row-tile active">
                <strong>Small Instance</strong>
                <span>2 vCPU • 4GB RAM • 80GB SSD</span>
                <b>$15 / mo</b>
              </button>
              <button type="button" className="row-tile">
                <strong>Medium Instance</strong>
                <span>4 vCPU • 8GB RAM • 160GB SSD</span>
                <b>$40 / mo</b>
              </button>
              <button type="button" className="row-tile">
                <strong>Large Instance</strong>
                <span>8 vCPU • 16GB RAM • 320GB SSD</span>
                <b>$85 / mo</b>
              </button>
            </div>
          </div>
        </div>

        <footer>
          <small>
            Estimated cost: <b>$15.00/month</b>
          </small>
          <div>
              <Link to="/customer-dashboard">
            <button type="button" className="ghost-btn">
              Cancel
            </button>
            </Link>
            <button type="button" className="primary-btn">
              Deploy Instance
            </button>
          </div>
        </footer>
      </div>
    </section>
  )
}
