import React, { Component } from 'react';
import axios from 'axios';


const axiosGitHubGraphQL = axios.create({
  baseURL: 'https://api.github.com/graphql',
  headers: {
    Authorization: `bearer ${process.env.REACT_APP_GITHUB_PERSONAL_ACCESS_TOKEN}`,
  },
});

const TITLE = 'React GraphQL GitHub Client';

const GET_ISSUES_OF_REPOSITORY = `
query($organization: String!, $repository: String!,$cursor: String) {
	organization(login: $organization) {
		name
		url
		repository(name: $repository) {
			name
			url
			issues(first: 5,after: $cursor, states: [OPEN]) {
				totalCount
				pageInfo {
					endCursor
					hasNextPage
				}
				edges {
					node {
						id
						title
						url
						reactions(last: 3) {
							edges {
								node {
									id
									content
								}
							}
						}
					}
				}
			}
		}
	}
}

`;

const getIssuesOfRepository = (path, cursor) => {
  const [organization, repository] = path.split('/');
  return axiosGitHubGraphQL.post('', {
    query: GET_ISSUES_OF_REPOSITORY,
    variables: { organization, repository, cursor }
  });
};

const resolveIssuesQuery = (queryResult, cursor) => state => {

  const { data, errors } = queryResult.data;

  if (!cursor) {
    return {
      organization: data.organization,
      errors,
    };
  }

  const { edges: oldIssues } = state.organization.repository.issues;
  const { edges: newIssues } = data.organization.repository.issues;
  const updatedIssues = [...oldIssues, ...newIssues];

  return {
    organization: {
      ...data.organization,
      repository: {
        ...data.organization.repository,
        issues: {
          ...data.organization.repository.issues,
          edges: updatedIssues,
        },
      },
    },
    errors,
  };
};


class App extends Component {

  state = {
    path: 'the-road-to-learn-react/the-road-to-learn-react',
    organization: null,
    errors: null
  };





  onFetchMoreIssues = () => {
    const { endCursor } = this.state.organization.repository.issues.pageInfo;
    this.onFetchFromGitHub(this.state.path, endCursor);
  }

  onFetchFromGitHub = (path, cursor) => {
    getIssuesOfRepository(path, cursor).then(results => {
      this.setState(resolveIssuesQuery(results, cursor));
    });
  }

  componentDidMount() {
    this.onFetchFromGitHub(this.state.path);
  }

  onChange = (evt) => {
    this.setState({ path: evt.target.value });
  }
  onSubmit = (evt) => {
    this.onFetchFromGitHub(this.state.path);
    evt.preventDefault();
  }

  render() {
    const { path, organization } = this.state;

    return (
      <div>
        <h1>{TITLE}</h1>

        <form onSubmit={this.onSubmit}>
          <label htmlFor="url">
            Show open issues for https://github.com
          </label>
          <input value={path} id="url" type="text" onChange={this.onChange} style={{ width: '300px' }} />
          <input type="submit" />
        </form>
        <hr />
        {organization ? <Organization onFetchMoreIssues={this.onFetchMoreIssues} organization={organization} /> : <p> No information yet ...</p>}

      </div>
    );
  }
}

const Organization = ({ organization, errors, onFetchMoreIssues }) => {

  if (errors) {
    return (
      <p>
        <strong>Something went wrong:</strong>
        {errors.map(error => error.message).join(' ')}
      </p>
    );
  }

  return (<div>
    <p>
      <strong>Issues from Organization:</strong>
      <a href={organization.url}>{organization.name}</a>
    </p>
    <Repository repository={organization.repository} onFetchMoreIssues={onFetchMoreIssues} />
  </div>)
};

const Repository = ({ repository, onFetchMoreIssues }) => (
  <div>
    <p>
      <strong>In Repository:</strong>
      <a href={repository.url}>{repository.name}</a>
    </p>
    <ul>
      {repository.issues.edges.map(issue => (
        <li key={issue.node.id}>
          <a href={issue.node.url}>{issue.node.title}</a>

          <ul>
            {issue.node.reactions.edges.map(reaction => (
              <li key={reaction.node.id}>{reaction.node.content}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>More
    <hr />

    {repository.issues.pageInfo.hasNextPage && (
      <button onClick={onFetchMoreIssues}>More</button>
    )}
  </div>
);

export default App;